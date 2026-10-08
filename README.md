# Live Collaborative Workspace and Code Pad

A real-time collaborative web workspace that allows multiple students to join a shared virtual room and simultaneously work on code or technical notes.

## 1. Project Overview

The Live Collaborative Workspace provides a browser-based environment where multiple users can collaborate in real time.

Users can:

- Create collaborative rooms
- Join rooms using a Room ID
- Protect rooms with optional passcodes
- Edit code or technical notes simultaneously
- View active participants
- See cursor/line presence
- See typing activity
- Monitor a live activity feed
- Handle rapid update bursts using server-side rate limiting
- Transfer host privileges when the current host disconnects

## 2. Objectives

The main objectives of the project are:

1. Provide a real-time collaborative coding environment.
2. Synchronize editor changes between multiple users.
3. Display participant presence and cursor activity.
4. Provide secure room access using optional passcodes.
5. Prevent excessive update requests using rate limiting.
6. Handle user disconnections and dynamically transfer host privileges.

## 3. Features

### Room Management

- Create custom rooms using Room IDs.
- Join existing rooms.
- Optional room passcode protection.
- Duplicate Room ID protection.
- Invalid passcodes are rejected.

### Collaborative Editor

- Monaco Editor is used for code editing.
- Changes are synchronized using Socket.IO.
- Multiple users can edit the same document.
- JavaScript syntax highlighting is supported.

### Participant Presence

The workspace displays:

- Active participants
- Current user
- Host status
- Active cursor line

### Typing Indicator

When a participant is typing, other users can see the typing activity.

### Activity Feed

The activity panel records events such as:

- Room creation
- User joining
- User disconnection
- Host privilege transfer

### Rate Limiting

The server limits document updates to prevent excessive requests.

A connection sending more than five document updates within one second is temporarily rate limited.

### Host Transfer

The room creator is initially assigned as host.

If the host disconnects:

- The remaining members stay in the room.
- The oldest active member becomes the new host.
- Other users are notified about the host transfer.

### Disconnect Handling

The server detects socket disconnections and updates:

- Participant list
- Activity feed
- Host assignment

## 4. Technology Stack

### Frontend

- React
- Vite
- Monaco Editor
- Socket.IO Client
- CSS

### Backend

- Node.js
- Express.js
- Socket.IO
- CORS

## 5. Project Structure

```text
LiveCollaborativeWorkspace/
│
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── socket.js
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── ...
│
├── server/
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── .gitignore
├── README.md
└── package.json