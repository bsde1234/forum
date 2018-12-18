import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import get from 'lodash/get';
import findKey from 'lodash/findKey';
import TextContent from './TextContent';
import { LOADING_STATUS, STANDARD_DATE_FORMAT, reactions } from '../utils/constants';
import { updatePost } from '../utils/dbhelpers';
import { useSubscribeToDocument, useGetUser, useGetRoles } from '../utils/hooks';
import ReactionButton from './ReactionButton';

function Post(props) {
	const [status, setStatus] = useState(null);
	const postRef = useRef();
	const contentRef = useRef();
	const db = props.db;
	
	const { doc: post, unsub: postUnsub } =
		useSubscribeToDocument("posts", props.postId, props);
	const uid = post ? post.uid : null;

	const postUser = useGetUser(uid);
	const postUserRoles = useGetRoles(uid);
	
	// scroll to bottom and update last read if/when post updates and is last post
	useEffect(() => {
		if (props.isLastOnPage && post) {
			postRef.current && postRef.current.scrollIntoView();
			props.updateLastRead(props.postId, post.updatedTime || post.createdTime);
		}
	}, [post || '', props.isLastOnPage || false]);
	
	useEffect(() => {
		postUnsub && postUnsub();
	}, []);
	
	function toggleEditMode() {
		if (status === LOADING_STATUS.EDITING) {
			setStatus(LOADING_STATUS.LOADED);
		} else {
			setStatus(LOADING_STATUS.EDITING);
		}
		props.toggleEditPost(props.postId);
	}
	
	function deletePost () {
		postUnsub && postUnsub();
		setStatus(LOADING_STATUS.DELETING);
		const deletePromises = [];
		deletePromises.push(
			db.collection("posts")
				.doc(props.postId)
				.delete()
				.then(() => console.log(`post ${props.postId} deleted`)));
		deletePromises.push(props.deletePostFromThread(props.postId));
		Promise.all(deletePromises)
			.then(() => {
				console.log(`Successfully deleted post ${props.postId}`);
			})
			.catch(e => setStatus(LOADING_STATUS.PERMISSIONS_ERROR));
	}
	
	function handleDeletePost() {
		props.setDialog({
			message: 'Sure you want to delete this post?',
			okText: 'delete',
			okClass: 'delete',
			onOk: deletePost
		});
	};
	
	function handleEditPost() {
		setStatus(LOADING_STATUS.SUBMITTING);
		updatePost(contentRef.current.value, null, props)
			.then(() => {
					//TODO: update thread "last updated" info
					setStatus(LOADING_STATUS.LOADED);
					props.toggleEditPost(props.postId);
			});
	}
	
	function renderAdminButtons() {
		const adminButtons = [];
	
		function addButton(name, buttonType, action, disabledCondition = false) {
				adminButtons.push(
					<button
						key={name}
						className={`small button-${buttonType}`}
						disabled={status === LOADING_STATUS.SUBMITTING || disabledCondition}
						onClick={action}>
							{name}
					</button>
				);
		}
		
		if (status !== LOADING_STATUS.EDITING) {
			addButton('quote', 'edit', () => props.handleQuote(post));
		}
		if (props.user.isAdmin || props.user.uid === post.uid) {
			if (status === LOADING_STATUS.EDITING) {
				addButton('cancel', 'cancel', toggleEditMode);
				addButton('ok', 'edit', handleEditPost);
			} else {
				addButton('edit', 'edit', toggleEditMode, props.isDisabled);
				const deleteAction = props.isOnlyPost
					? props.deleteThread
					: handleDeletePost;
				addButton('delete', 'delete', deleteAction, props.isDisabled);
			}
		}
		return adminButtons;
	}
	
	// TODO: Permissions error - popup - unlikely case though.
	if (status === LOADING_STATUS.DELETED) {
		// this shouldn't happen... but just in case
		return (
			<div key={props.postId} className="post-container">
				This post has been deleted.
			</div>
		);
	}
	if (!post || status === LOADING_STATUS.LOADING || status === LOADING_STATUS.DELETING) {
		return (
			<div key={props.postId} className="post-container">
				<div className="loader loader-med"></div>
			</div>
		);
	}
	let currentReaction = null;
	if (post.reactions) {
		currentReaction = findKey(post.reactions, uids => uids.includes(props.user.uid));
	}
	const footer = (
		<div className="post-footer">
			<div className="reactions-container">
				{reactions.map(reaction => (
					<ReactionButton
						key={reaction.faName}
						currentReaction={currentReaction}
						reaction={reaction}
						post={post}
						{...props} />
					)
				)}
			</div>
			<div>{renderAdminButtons()}</div>
		</div>
	);
	const classes = ['post-container'];
	if (status === LOADING_STATUS.EDITING) {
		classes.push('editing');
	}
	if (props.isDisabled) {
		classes.push('disabled');
	}
	if (post.createdTime > (props.lastReadTime || 0)) {
		classes.push('unread');
	}
	return (
		<div key={post.id} ref={postRef} className={classes.join(' ')}>
			<div className="post-header">
				<div className="post-user">
					{postUser && postUser.avatarUrl && <img className="avatar-post" alt="User's Avatar" src={postUser.avatarUrl} />}
					{postUser
						? <div>{postUser.displayName}</div>
						: <div className="loader loader-small"></div>}
					{postUserRoles && postUserRoles.isAdmin && <div className="role-icon">A</div>}
					{postUserRoles && postUserRoles.isMod && <div className="role-icon">M</div>}
				</div>
				<div className="post-header-right">
					<div>#{props.index}</div>
					<div className="post-date">{format(post.createdTime, STANDARD_DATE_FORMAT)}</div>
				</div>
			</div>
			<div className="post-content">
				{status === LOADING_STATUS.EDITING ? (
						<form className="edit-post-container" onSubmit={handleEditPost}>
							<textarea ref={contentRef} className="content-input" defaultValue={post.content} />
						</form>
					) : (
						<TextContent
							content={post.content}
							user={props.user}
							usersByUid={props.usersByUid}
							addUserByUid={props.addUserByUid}
						/>
					)
				}
			</div>
			{post.updatedBy &&
				<div className="post-edited">
					<span>Last edited</span>
					<span className="edit-data">{format(post.updatedTime, STANDARD_DATE_FORMAT)}</span>
					<span>by</span>
					<span className="edit-data">{get(props.usersByUid, [post.updatedBy, 'displayName']) || ''}</span>
				</div>}
			{footer}
		</div>
	);
}

export default Post;
