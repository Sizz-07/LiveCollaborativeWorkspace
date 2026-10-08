import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

function App() {
    const [mode, setMode] = useState("home");

    const [name, setName] = useState("");
    const [roomId, setRoomId] = useState("");
    const [passcode, setPasscode] = useState("");

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [roomJoined, setRoomJoined] = useState(false);
    const [isHost, setIsHost] = useState(false);

    const [members, setMembers] = useState([]);
    const [activity, setActivity] = useState([]);

    const [code, setCode] = useState("// Start coding together...\n");

    const [typingUsers, setTypingUsers] = useState([]);
    const [activeLines, setActiveLines] = useState({});

    const [mySocketId, setMySocketId] = useState("");

    const editorRef = useRef(null);

    useEffect(() => {
        socket.on("connect", () => {
            console.log("Connected:", socket.id);
            setMySocketId(socket.id);
        });

        socket.on("roomCreated", (data) => {
            setRoomJoined(true);
            setIsHost(true);
            setRoomId(data.roomId);
            setCode(data.content);
            setMembers(data.members);
            setActivity(data.activity);
            setMessage(`Room ${data.roomId} created successfully.`);
            setError("");
        });

        socket.on("roomJoined", (data) => {
            setRoomJoined(true);
            setIsHost(data.host);
            setRoomId(data.roomId);
            setCode(data.content);
            setMembers(data.members);
            setActivity(data.activity);
            setMessage(`Joined room ${data.roomId}.`);
            setError("");
        });

        socket.on("roomError", (msg) => {
            setError(msg);
        });

        socket.on("documentUpdate", (newContent) => {
            setCode(newContent);
        });

        socket.on("membersUpdated", (updatedMembers) => {
            setMembers(updatedMembers);
        });

        socket.on("activityUpdate", (data) => {
            setActivity((previous) => [
                ...previous,
                data.message
            ]);
        });

        socket.on("typing", (data) => {
            setTypingUsers((previous) => {
                if (data.isTyping) {
                    if (!previous.includes(data.name)) {
                        return [...previous, data.name];
                    }

                    return previous;
                }

                return previous.filter(
                    (name) => name !== data.name
                );
            });
        });

        socket.on("cursorUpdate", (data) => {
            console.log("CURSOR UPDATE RECEIVED:", data);

            setActiveLines((previous) => ({
                ...previous,
                [data.socketId]: {
                    name: data.name,
                    lineNumber: data.position.lineNumber
                }
            }));
        });

        socket.on("hostChanged", (data) => {
            setIsHost(data.host === socket.id);

            setActivity((previous) => [
                ...previous,
                "Host privileges transferred"
            ]);
        });

        socket.on("rateLimited", (msg) => {
            setMessage(msg);
        });

        return () => {
            socket.off("connect");
            socket.off("roomCreated");
            socket.off("roomJoined");
            socket.off("roomError");
            socket.off("documentUpdate");
            socket.off("membersUpdated");
            socket.off("activityUpdate");
            socket.off("typing");
            socket.off("cursorUpdate");
            socket.off("hostChanged");
            socket.off("rateLimited");
        };
    }, []);

    const handleCreateRoom = () => {
        setError("");
        setMessage("");

        if (!name || !roomId) {
            setError("Please enter your name and Room ID.");
            return;
        }

        socket.emit("createRoom", {
            name,
            roomId,
            passcode
        });
    };

    const handleJoinRoom = () => {
        setError("");
        setMessage("");

        if (!name || !roomId) {
            setError("Please enter your name and Room ID.");
            return;
        }

        socket.emit("joinRoom", {
            name,
            roomId,
            passcode
        });
    };

    const handleEditorChange = (value) => {
        setCode(value || "");

        socket.emit("documentUpdate", value || "");

        socket.emit("typing", true);

        clearTimeout(window.typingTimer);

        window.typingTimer = setTimeout(() => {
            socket.emit("typing", false);
        }, 800);
    };

    const handleEditorMount = (editor) => {
        console.log("EDITOR MOUNTED");

        editorRef.current = editor;

        editor.onDidChangeCursorPosition((event) => {
            console.log("MY CURSOR MOVED:", event.position);

            socket.emit("cursorUpdate", {
                lineNumber: event.position.lineNumber,
                column: event.position.column
            });
        });
    };

    if (!roomJoined) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "#111827",
                    color: "white",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontFamily: "Arial"
                }}
            >
                <div
                    style={{
                        width: "400px",
                        background: "#1f2937",
                        padding: "30px",
                        borderRadius: "12px"
                    }}
                >
                    <h1>Live Collaborative Workspace</h1>

                    <p>
                        Create or join a collaborative coding room.
                    </p>

                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px",
                            marginBottom: "10px",
                            boxSizing: "border-box"
                        }}
                    />

                    <input
                        type="text"
                        placeholder="Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px",
                            marginBottom: "10px",
                            boxSizing: "border-box"
                        }}
                    />

                    <input
                        type="password"
                        placeholder="Passcode (optional)"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px",
                            marginBottom: "15px",
                            boxSizing: "border-box"
                        }}
                    />

                    <button
                        onClick={handleCreateRoom}
                        style={{
                            width: "100%",
                            padding: "10px",
                            marginBottom: "10px",
                            cursor: "pointer"
                        }}
                    >
                        Create Room
                    </button>

                    <button
                        onClick={handleJoinRoom}
                        style={{
                            width: "100%",
                            padding: "10px",
                            cursor: "pointer"
                        }}
                    >
                        Join Room
                    </button>

                    {error && (
                        <p style={{ color: "#ef4444" }}>
                            {error}
                        </p>
                    )}

                    {message && (
                        <p style={{ color: "#22c55e" }}>
                            {message}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                fontFamily: "Arial",
                background: "#111827",
                color: "white"
            }}
        >
            <div
                style={{
                    height: "60px",
                    background: "#1f2937",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 20px"
                }}
            >
                <div>
                    <strong>Live Collaborative Workspace</strong>

                    <span style={{ marginLeft: "20px" }}>
                        Room: {roomId}
                    </span>

                    {isHost && (
                        <span
                            style={{
                                marginLeft: "15px",
                                color: "#22c55e"
                            }}
                        >
                            HOST
                        </span>
                    )}
                </div>

                <div>
                    You: {name}
                </div>
            </div>

            <div
                style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "1fr 280px 300px",
                    overflow: "hidden"
                }}
            >
                <div
                    style={{
                        borderRight: "1px solid #374151",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <div
                        style={{
                            padding: "10px",
                            background: "#1f2937"
                        }}
                    >
                        <strong>Code Editor</strong>
                    </div>

                    <div style={{ flex: 1 }}>
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            theme="vs-dark"
                            value={code}
                            onChange={handleEditorChange}
                            onMount={handleEditorMount}
                            options={{
                                fontSize: 15,
                                minimap: {
                                    enabled: false
                                },
                                automaticLayout: true
                            }}
                        />
                    </div>
                </div>

                <div
                    style={{
                        borderRight: "1px solid #374151",
                        background: "#1f2937",
                        padding: "15px",
                        overflowY: "auto"
                    }}
                >
                    <h3>Participants</h3>

                    {members.map((member) => (
                        <div
                            key={member.socketId}
                            style={{
                                padding: "10px",
                                marginBottom: "8px",
                                background: "#374151",
                                borderRadius: "8px"
                            }}
                        >
                            <div>
                                {member.name}

                                {member.socketId === socket.id && (
                                    <span
                                        style={{
                                            marginLeft: "8px",
                                            color: "#22c55e"
                                        }}
                                    >
                                        (You)
                                    </span>
                                )}
                            </div>

                            {member.socketId === socket.id &&
                                isHost && (
                                    <small
                                        style={{
                                            color: "#facc15"
                                        }}
                                    >
                                        Host
                                    </small>
                                )}

                            {activeLines[member.socketId] && (
                                <small
                                    style={{
                                        display: "block",
                                        color: "#60a5fa",
                                        marginTop: "4px"
                                    }}
                                >
                                    Line{" "}
                                    {activeLines[member.socketId].lineNumber}
                                </small>
                            )}
                        </div>
                    ))}

                    {typingUsers.length > 0 && (
                        <div
                            style={{
                                marginTop: "15px",
                                color: "#9ca3af"
                            }}
                        >
                            {typingUsers.join(", ")}
                            {typingUsers.length === 1
                                ? " is typing..."
                                : " are typing..."}
                        </div>
                    )}
                </div>

                <div
                    style={{
                        background: "#111827",
                        padding: "15px",
                        overflowY: "auto"
                    }}
                >
                    <h3>Activity</h3>

                    {activity.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                padding: "8px",
                                borderBottom:
                                    "1px solid #374151",
                                fontSize: "14px"
                            }}
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            {message && (
                <div
                    style={{
                        position: "fixed",
                        bottom: "20px",
                        left: "20px",
                        background: "#1f2937",
                        padding: "10px 15px",
                        borderRadius: "8px"
                    }}
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    style={{
                        position: "fixed",
                        bottom: "20px",
                        right: "20px",
                        background: "#7f1d1d",
                        padding: "10px 15px",
                        borderRadius: "8px"
                    }}
                >
                    {error}
                </div>
            )}
        </div>
    );
}

export default App;