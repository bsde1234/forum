import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import { format } from 'date-fns';
import { STANDARD_DATE_FORMAT } from '../utils/constants';
import { getAllUsers,
	getAllInvites,
	verifyAllUsers,
	pwotAllUsers,
	migrateAllAvatars,
	toggleBan,
	toggleMod,
	toggleVal,
	getClaims,
	migrateToTree
} from '../utils/dbhelpers';

function Admin() {
	const [users, setUsers] = useState([]);
	const [invites, setInvites] = useState([]);
	const [userIsAdmin, setUserIsAdmin] = useState(false);
	const [pageDisabled, setPageDisabled] = useState(false);
	const [showEmails, setShowEmails] = useState(false);
	
	useEffect(() => {
		getAllUsers(true).then(users => setUsers(users));
		getAllInvites().then(invites => setInvites(invites));
		getClaims().then(claims => setUserIsAdmin(claims.admin))
	}, []);
	
	function onBanClick(uid, isBanned) {
		setPageDisabled(true);
		toggleBan(uid, !isBanned)
			.then(() => getAllUsers(true))
			.then(users => setUsers(users))
			.catch(e => console.error(e))
			.finally(() => setPageDisabled(false));
	}
	
	function onModClick(uid, isMod) {
		setPageDisabled(true);
		toggleMod(uid, !isMod)
			.then(() => getAllUsers(true))
			.then(users => setUsers(users))
			.catch(e => console.error(e))
			.finally(() => setPageDisabled(false));
	}
	
	function onValidateClick(uid, shouldVal) {
		setPageDisabled(true);
		toggleVal(uid, shouldVal)
			.then(() => getAllUsers(true))
			.then(users => setUsers(users))
			.catch(e => console.error(e))
			.finally(() => setPageDisabled(false));
	}

	function toggleShowEmails() {
		setShowEmails(!showEmails);
	}
	
	if (!userIsAdmin) {
		return (
			<div className="admin-container">
				Sorry! You don't have permissions!
			</div>
		);
	}
	if (pageDisabled) {
		return (
			<div className="admin-container">
				Updating the database.
			</div>
		);
	}
	return (
		<div className="admin-container">
			<div className="table-title">Invites</div>
			<table>
				<thead>
					<tr>
						<th>Code</th>
						<th>Was Used?</th>
						<th>Used By</th>
						<th>Created By</th>
						<th>Created At</th>
					</tr>
				</thead>
				<tbody>
				{invites.map(invite => (
					<tr key={invite.id}>
						<td>{invite.id}</td>
						<td>{invite.wasUsed ? 'yes' : 'no'}</td>
						<td>{invite.wasUsed && invite.usedBy}</td>
						<td>{invite.createdByName}</td>
						<td>{invite.createdAt ? format(invite.createdAt, STANDARD_DATE_FORMAT) : '??'}</td>
					</tr>
				))}
				</tbody>
			</table>
			<hr />
			<div className="table-title">Users</div>
			<button className="button-edit" onClick={() => verifyAllUsers(users)}>verify all users</button>
			<button className="button-edit" onClick={() => pwotAllUsers(users)}>pwot all users</button>
			<button className="button-edit" onClick={migrateAllAvatars}>migrate all avatars</button>
			<button className="button-edit" onClick={migrateToTree}>migrate to tree structure</button>
			<table>
				<thead>
					<tr>
						<th>Display Name</th>
						<th>
							<button className="button-edit" onClick={() => toggleShowEmails()}>
								{showEmails ? 'hide' : 'show'} emails
							</button>
						</th>
						<th>Has Avatar</th>
						<th>Validated</th>
						<th>PWOT</th>
						<th>Role</th>
						<th>Banned</th>
					</tr>
				</thead>
				<tbody>
				{users.map(user => {
					const isAdmin = user.customClaims.admin;
					const isMod = user.customClaims.mod;
					const isBanned = user.customClaims.banned;
					const role = isAdmin ? 'admin' : (isMod ? 'mod' : '-');
					return (
						<tr key={user.uid}>
							<td>{user.displayName}</td>
							<td>{showEmails ? user.email : '--------------------------------------'}</td>
							<td>{user.photoURL ? 'av' : 'no av'}</td>
							<td>
								<div className="action-cell">
									{user.customClaims.validated ? 'V' : '-'}
									{!isAdmin && (
										<button onClick={() => onValidateClick(user.uid, !user.customClaims.validated)}>
										{user.customClaims.validated ? 'undo' : 'val'}
										</button>
									)}
								</div>
							</td>
							<td>{user.customClaims.pwot ? 'V' : '-'}</td>
							<td>
								<div className="action-cell">
									{role}
									{!isAdmin && (
										<button onClick={() => onModClick(user.uid, isMod)}>
										{isMod ? 'unmod' : 'mod'}
										</button>
									)}
								</div>
							</td>
							<td>
								<div className="action-cell">
									{isBanned ? 'V' : '-'}
									<button onClick={() => onBanClick(user.uid, isBanned)}>
										{isBanned ? 'unban' : 'ban'}
									</button>
								</div>
							</td>
						</tr>
					);
				})}
				</tbody>
			</table>
		</div>
	);
}

export default Admin;
