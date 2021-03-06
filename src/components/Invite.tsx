import React, { useState, useEffect, FormEvent } from "react";
import { format } from "date-fns";
import { STANDARD_DATE_FORMAT } from "../utils/constants";
import { generateInviteCode, getAllInvitesFor } from "../utils/dbhelpers";
import { RouteComponentProps } from "@reach/router";
import { Invite as InviteInterface } from "../utils/types";

interface InviteProps extends RouteComponentProps {
  user: firebase.User;
}

export default function Invite({ user }: InviteProps) {
  const [code, setCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteInterface[] | null>(null);

  useEffect(() => {
    getAllInvitesFor(user.uid).then((invites) => setInvites(invites));
  });

  async function onGenerateCode(e: FormEvent) {
    e.preventDefault();
    const createdByName = `${user.displayName} (${user.email})`;
    try {
      const code = await generateInviteCode(createdByName, user.uid);
      setCode(code);
      const invites = await getAllInvitesFor(user.uid);
      setInvites(
        invites.sort((a, b) => ((a.usedAt || 0) > (b.usedAt || 0) ? 1 : -1))
      );
    } catch (e) {
      setInviteError(e);
    }
  }
  if (!invites) {
    return (
      <div className="page-center">
        <div className="loader loader-big" />
      </div>
    );
  }
  const usedInvites = invites.filter((invite) => invite.wasUsed);
  const unusedInvites = invites.filter((invite) => !invite.wasUsed);
  const unusedInvitesTable = unusedInvites.length > 0 && (
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Link</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {unusedInvites.map((invite) => (
          <tr key={invite.id}>
            <td>{invite.id}</td>
            <td>
              <input
                onClick={(e) => (e.target as HTMLInputElement).select()}
                onChange={(e) => e.preventDefault()}
                value={`https://${window.location.host}/code/${invite.id}`}
                className="invite-code"
              />
            </td>
            <td>
              {invite.createdAt
                ? format(invite.createdAt, STANDARD_DATE_FORMAT)
                : "??"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const usedInvitesTable = usedInvites.length > 0 && (
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Used By</th>
          <th>Used At</th>
        </tr>
      </thead>
      <tbody>
        {usedInvites.map((invite) => (
          <tr key={invite.id}>
            <td>{invite.id}</td>
            <td>{invite.usedBy}</td>
            <td>
              {invite.usedAt
                ? format(invite.usedAt, STANDARD_DATE_FORMAT)
                : "??"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const noInvitesMessage = !invites.length && (
    <div>You haven't created any invites yet.</div>
  );
  return (
    <div className="container mx-auto">
      <form
        className="flex flex-col items-start p-2 border border-neutral rounded my-2"
        onSubmit={onGenerateCode}
      >
        <button className="btn btn-ok">generate invite code</button>
        {code && (
          <input
            onClick={(e) => (e.target as HTMLInputElement).select()}
            onChange={(e) => e.preventDefault()}
            value={`https://${window.location.host}/code/${code}`}
            className="invite-code"
          />
        )}
        {code && (
          <div className="m-1">
            Give this link to a friend. It'll take them to a one-time use page
            where they can sign up.
          </div>
        )}
        {inviteError && <div className="text-danger">{inviteError}</div>}
      </form>
      <div className="my-4">
        <div className="text-2xl text-main">Invites You've Created</div>
        {unusedInvitesTable}
        {noInvitesMessage}
      </div>
      {usedInvites.length > 0 && (
        <div className="my-4">
          <div className="text-2xl text-main">Used Invites</div>
          {usedInvitesTable}
        </div>
      )}
    </div>
  );
}
