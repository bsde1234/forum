import React, { Component } from 'react';
import '../styles/Posts.css';
import Post from './Post.js';
import { Link } from '@reach/router';
import firebase from 'firebase';
import 'firebase/firestore';
import { LOADING_STATUS, POSTS_PER_PAGE } from '../utils/constants';
import without from 'lodash/without';
import trim from 'lodash/trim';
import range from 'lodash/range';
import { getForum, updateThread } from '../utils/dbhelpers';

class PostList extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
		this.contentRef = React.createRef();
		this.threadUnsub = null;
		this.state = { status: LOADING_STATUS.LOADING, postBeingEdited: null };
	}
	componentDidMount = () => {
	  getForum(this.props);
		this.threadUnsub = this.db.collection("threads")
			.doc(this.props.threadId)
			.onSnapshot(threadDoc => {
				this.setState({ thread: threadDoc.data(), status: LOADING_STATUS.LOADED });
			});
	}
	componentWillUnmount = () => {
		this.threadUnsub && this.threadUnsub();
	}
	handleDeleteThread = () => {
		this.props.setDialog({
			message: 'Sure you want to delete thread: ' + this.state.thread.title + '?',
			okText: 'delete',
			okClass: 'delete',
			onOk: this.deleteThread
		});
	};
	handleQuote = ({ content, uid }) => {
		this.contentRef.current.value =
			`[quote uid=${uid}]${content}[/quote]\n` + this.contentRef.current.value;
	}
	deleteThread = () => {
		this.threadUnsub && this.threadUnsub();
		this.setState({ status: LOADING_STATUS.DELETING });
		const deletePromises = [];
		this.state.thread.postIds.forEach(postId => {
			deletePromises.push(
				this.db.collection("posts")
					.doc(postId)
					.delete()
					.then(() => console.log(`post ${postId} deleted`)));
		});
		deletePromises.push(
			this.db.collection("threads")
				.doc(this.props.threadId)
				.delete()
				.then(() => console.log(`thread ${this.props.threadId} deleted`)));
		// TODO: Update forum based on latest updated thread remaining.
		Promise.all(deletePromises)
			.then(() => {
				this.setState({ thread: null, status: LOADING_STATUS.DELETED });
			})
			.catch(e => this.setState({ status: LOADING_STATUS.PERMISSIONS_ERROR}));
	}
	handleSubmitPost = (e) => {
		e.preventDefault();
		const now = Date.now();
		this.db.collection("posts").add({
			uid: this.props.user.uid,
	    content: this.contentRef.current.value,
	    parentThread: this.props.threadId,
	    createdTime: now,
	    updatedTime: now
		})
		.then((docRef) => {
			this.contentRef.current.value = '';
			updateThread(this.props.threadId, {
				updatedTime: now,
				updatedBy: this.props.user.uid,
				postIds: this.state.thread.postIds.concat(docRef.id)
			}, this.props.forumId);
	    console.log("Document written with ID: ", docRef.id);
		});
	};
	handleDeletePostFromThread = (postId) => {
		const postIds = this.state.thread.postIds;
		const updates = {
				postIds: without(postIds, postId)
		};
		if (postIds[postIds.length - 1] === postId) {
			// if this was the last post, change updated time to previous post
			// this isn't perfect - another post might have been edited later
			// but close enough for now
			return this.db.collection('posts')
				.doc(postIds[postIds.length - 2])
				.get()
				.then(ref => {
					const post = ref.data();
					updates.updatedTime = post.updatedTime || post.createdTime;
					updates.updatedBy = post.uid;
					return updates;
				})
				.then(updates => updateThread(this.props.threadId, updates, this.props.forumId));
		} else {
			return updateThread(this.props.threadId, updates, this.props.forumId);
		}
	}
	handleToggleEditPost = (postId) => {
		if (!this.state.postBeingEdited) {
			this.setState({ postBeingEdited: postId });
		} else {
			this.setState({ postBeingEdited: null });
		}
	}
	render() {
		if (this.state.status === LOADING_STATUS.DELETING) {
			return (
			  <div className="page-message-container">
		      <div>deleting</div>
		      <div className="loader loader-med"></div>
				</div>
			);
		}
	  if (this.state.status === LOADING_STATUS.LOADING) {
			return (
			  <div className="page-message-container">
		      <div className="loader loader-med"></div>
				</div>
			);
	  }
		if (this.state.status === LOADING_STATUS.PERMISSIONS_ERROR) {
			return (
			  <div className="page-message-container">
		      <div>Sorry, you don't have permission to do that.</div>
		      <div><a onClick={() => this.setState({ status: LOADING_STATUS.LOADED })}>Back to thread.</a></div>
				</div>
			);
		}
		if (this.state.status === LOADING_STATUS.DELETED || !this.state.thread) {
			return (
			  <div className="page-message-container">
		      <div>This thread has been deleted.</div>
		      <div><Link to="/">Back to top.</Link></div>
				</div>
			);
		}
	  const forum = this.props.forumsById[this.props.forumId] || {};
	  let { posts = POSTS_PER_PAGE, page = 0 } = this.props.location.search.split('&')
	  	.reduce((lookup, pairString) => {
	  		const pair = trim(pairString, '?').split('=');
	  		lookup[pair[0]] = pair[1];
	  		return lookup;
	  	}, {});
	  page = parseInt(page, 10);
	  const start = posts * page;
	  const end = posts * (page + 1);
	  const pages = Math.ceil(this.state.thread.postIds.length / posts);
	  const postList = this.state.thread.postIds &&
	  	this.state.thread.postIds
	  		.slice(start, end)
	  		.map((postId, index) => ({ id: postId, index: index + start }));
	  const paginationBox = (
		  <div className="pagination-control">
		  	page
		  	{range(pages)
		  		.map(pageNum => {
		  			const pageLink = `/forum/${this.props.forumId}` +
		  				`/thread/${this.props.threadId}` +
		  				`?page=${pageNum}&posts=${posts}`;
		  			const classes = ['page-link'];
		  			if (pageNum === page) {
		  				classes.push('selected');
		  			}
			  		return (
			  			<Link className={classes.join(' ')} to={pageLink}>
			  			{pageNum}</Link>
			  		);
		  			
		  		})}
		  </div>
	  );
		return (
			<div className="post-list-container">
			  <div className="section-header">
			  	<div className="breadcrumbs">
			  		<span>
	  		  		<Link className="thread-label" to="/">
	  		  			Home
	  	  			</Link>
	  	  			<span className="title-caret">&gt;</span>
  	  			</span>
			  		<span>
				  		<Link className="thread-label" to={`/forum/${this.props.forumId}`}>
				  			{forum.name}
			  			</Link>
			  			<span className="title-caret">&gt;</span>
		  			</span>
			  		<span className="thread-title">{this.state.thread.title}</span>
		  		</div>
		  		<div>
		  			{this.props.user.isAdmin &&
		  				<button className="button-delete" onClick={this.handleDeleteThread}>
		  					delete
	  					</button>
		  			}
		  		</div>
			  </div>
			  {paginationBox}
				{!this.state.thread.postIds && "loading"}
				{postList && postList.map(({ id, index }) => (
					<Post
						key={id}
						postId={id}
						user={this.props.user}
						index={index}
						isDisabled={this.state.postBeingEdited && this.state.postBeingEdited !== id}
						isOnlyPost={this.state.thread.postIds.length === 1}
						deleteThread={this.handleDeleteThread}
						deletePostFromThread={this.handleDeletePostFromThread}
						toggleEditPost={this.handleToggleEditPost}
						usersByUid={this.props.usersByUid}
						addUserByUid={this.props.addUserByUid}
						setDialog={this.props.setDialog}
						handleQuote={this.handleQuote}
					/>
				))}
			  {paginationBox}
				<form className="new-post-container" onSubmit={this.handleSubmitPost}>
					<div className="form-line">
					  <label>Add a post</label>
						<textarea ref={this.contentRef} className="content-input" placeholder="Type new post here" />
					</div>
					<div className="form-line">
						<button>Submit Post</button>
					</div>
				</form>
			</div>
		);
	}
}

export default PostList;
