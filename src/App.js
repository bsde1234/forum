import React, { Component } from 'react';
import './App.css';
import { Router, Link } from '@reach/router';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import ThreadList from './ThreadList.js';
import PostList from './PostList.js';
import firebase from 'firebase';
import 'firebase/firestore';

// Configure FirebaseUI.


class App extends Component {
  constructor() {
    super();
    this.state = {
      user: 'unknown'
    };
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
	  this.uiConfig = {
      // Popup signin flow rather than redirect flow.
      signInFlow: 'popup',
      callbacks: {
        // Avoid redirects after sign-in.
        signInSuccessWithAuthResult: (result) => {
          if (result.additionalUserInfo.isNewUser) {
        		this.db.collection("users").doc(result.user.uid).set({
                displayName: result.user.displayName,
                email: result.user.email
            });
          }
        }
      },
      signInOptions: [
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
        firebase.auth.GoogleAuthProvider.PROVIDER_ID
      ]
    };
  }
  componentDidMount = () => {
    this.unregisterAuthObserver = firebase.auth().onAuthStateChanged(
        (user) => this.setState({ user })
    );
  }
  render() {
    if (this.state.user === 'unknown') {
      return (
        <div className="loading-page">
  				<div className="loader loader-big"></div>
  			</div>);
    } else if (!this.state.user) {
      return (
        <StyledFirebaseAuth
          uiConfig={this.uiConfig}
          firebaseAuth={firebase.auth()}
        />
      );
    }
    return (
      <div className="App">
        <div className="page-header">
          <div><Link to="/">Home</Link></div>
          <div>
            <a
              className="sign-out-button"
              onClick={() => firebase.auth().signOut()}>
                Logout
            </a>
          </div>
        </div>
        <Router>
          <ThreadList path="/" user={this.state.user} />
          <PostList path="thread/:threadId" user={this.state.user} />
        </Router>
      </div>
    );
  }
}

export default App;
