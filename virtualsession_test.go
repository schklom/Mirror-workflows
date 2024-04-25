/**
 * Standalone signaling server for the Nextcloud Spreed app.
 * Copyright (C) 2019 struktur AG
 *
 * @author Joachim Bauch <bauch@struktur.de>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package signaling

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"
)

func TestVirtualSession(t *testing.T) {
	t.Parallel()
	CatchLogForTest(t)
	hub, _, _, server := CreateHubForTest(t)

	roomId := "the-room-id"
	emptyProperties := json.RawMessage("{}")
	backend := &Backend{
		id:     "compat",
		compat: true,
	}
	room, err := hub.createRoom(roomId, &emptyProperties, backend)
	if err != nil {
		t.Fatalf("Could not create room: %s", err)
	}
	defer room.Close()

	clientInternal := NewTestClient(t, server, hub)
	defer clientInternal.CloseWithBye()
	if err := clientInternal.SendHelloInternal(); err != nil {
		t.Fatal(err)
	}

	client := NewTestClient(t, server, hub)
	defer client.CloseWithBye()
	if err := client.SendHello(testDefaultUserId); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), testTimeout)
	defer cancel()

	if hello, err := clientInternal.RunUntilHello(ctx); err != nil {
		t.Error(err)
	} else {
		if hello.Hello.UserId != "" {
			t.Errorf("Expected empty user id, got %+v", hello.Hello)
		}
		if hello.Hello.SessionId == "" {
			t.Errorf("Expected session id, got %+v", hello.Hello)
		}
		if hello.Hello.ResumeId == "" {
			t.Errorf("Expected resume id, got %+v", hello.Hello)
		}
	}
	hello, err := client.RunUntilHello(ctx)
	if err != nil {
		t.Error(err)
	}

	if room, err := client.JoinRoom(ctx, roomId); err != nil {
		t.Fatal(err)
	} else if room.Room.RoomId != roomId {
		t.Fatalf("Expected room %s, got %s", roomId, room.Room.RoomId)
	}

	// Ignore "join" events.
	if err := client.DrainMessages(ctx); err != nil {
		t.Error(err)
	}

	internalSessionId := "session1"
	userId := "user1"
	msgAdd := &ClientMessage{
		Type: "internal",
		Internal: &InternalClientMessage{
			Type: "addsession",
			AddSession: &AddSessionInternalClientMessage{
				CommonSessionInternalClientMessage: CommonSessionInternalClientMessage{
					SessionId: internalSessionId,
					RoomId:    roomId,
				},
				UserId: userId,
				Flags:  FLAG_MUTED_SPEAKING,
			},
		},
	}
	if err := clientInternal.WriteJSON(msgAdd); err != nil {
		t.Fatal(err)
	}

	msg1, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	// The public session id will be generated by the server, so don't check for it.
	if err := client.checkMessageJoinedSession(msg1, "", userId); err != nil {
		t.Fatal(err)
	}
	sessionId := msg1.Event.Join[0].SessionId
	session := hub.GetSessionByPublicId(sessionId)
	if session == nil {
		t.Fatalf("Could not get virtual session %s", sessionId)
	}
	if session.ClientType() != HelloClientTypeVirtual {
		t.Errorf("Expected client type %s, got %s", HelloClientTypeVirtual, session.ClientType())
	}
	if sid := session.(*VirtualSession).SessionId(); sid != internalSessionId {
		t.Errorf("Expected internal session id %s, got %s", internalSessionId, sid)
	}

	// Also a participants update event will be triggered for the virtual user.
	msg2, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	updateMsg, err := checkMessageParticipantsInCall(msg2)
	if err != nil {
		t.Error(err)
	} else if updateMsg.RoomId != roomId {
		t.Errorf("Expected room %s, got %s", roomId, updateMsg.RoomId)
	} else if len(updateMsg.Users) != 1 {
		t.Errorf("Expected one user, got %+v", updateMsg.Users)
	} else if sid, ok := updateMsg.Users[0]["sessionId"].(string); !ok || sid != sessionId {
		t.Errorf("Expected session id %s, got %+v", sessionId, updateMsg.Users[0])
	} else if virtual, ok := updateMsg.Users[0]["virtual"].(bool); !ok || !virtual {
		t.Errorf("Expected virtual user, got %+v", updateMsg.Users[0])
	} else if inCall, ok := updateMsg.Users[0]["inCall"].(float64); !ok || inCall != (FlagInCall|FlagWithPhone) {
		t.Errorf("Expected user in call with phone, got %+v", updateMsg.Users[0])
	}

	msg3, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}

	flagsMsg, err := checkMessageParticipantFlags(msg3)
	if err != nil {
		t.Error(err)
	} else if flagsMsg.RoomId != roomId {
		t.Errorf("Expected room %s, got %s", roomId, flagsMsg.RoomId)
	} else if flagsMsg.SessionId != sessionId {
		t.Errorf("Expected session id %s, got %s", sessionId, flagsMsg.SessionId)
	} else if flagsMsg.Flags != FLAG_MUTED_SPEAKING {
		t.Errorf("Expected flags %d, got %+v", FLAG_MUTED_SPEAKING, flagsMsg.Flags)
	}

	newFlags := uint32(FLAG_TALKING)
	msgFlags := &ClientMessage{
		Type: "internal",
		Internal: &InternalClientMessage{
			Type: "updatesession",
			UpdateSession: &UpdateSessionInternalClientMessage{
				CommonSessionInternalClientMessage: CommonSessionInternalClientMessage{
					SessionId: internalSessionId,
					RoomId:    roomId,
				},
				Flags: &newFlags,
			},
		},
	}
	if err := clientInternal.WriteJSON(msgFlags); err != nil {
		t.Fatal(err)
	}

	msg4, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}

	flagsMsg, err = checkMessageParticipantFlags(msg4)
	if err != nil {
		t.Error(err)
	} else if flagsMsg.RoomId != roomId {
		t.Errorf("Expected room %s, got %s", roomId, flagsMsg.RoomId)
	} else if flagsMsg.SessionId != sessionId {
		t.Errorf("Expected session id %s, got %s", sessionId, flagsMsg.SessionId)
	} else if flagsMsg.Flags != newFlags {
		t.Errorf("Expected flags %d, got %+v", newFlags, flagsMsg.Flags)
	}

	// A new client will receive the initial flags of the virtual session.
	client2 := NewTestClient(t, server, hub)
	defer client2.CloseWithBye()
	if err := client2.SendHello(testDefaultUserId + "2"); err != nil {
		t.Fatal(err)
	}

	if _, err := client2.RunUntilHello(ctx); err != nil {
		t.Error(err)
	}

	if room, err := client2.JoinRoom(ctx, roomId); err != nil {
		t.Fatal(err)
	} else if room.Room.RoomId != roomId {
		t.Fatalf("Expected room %s, got %s", roomId, room.Room.RoomId)
	}

	gotFlags := false
	var receivedMessages []*ServerMessage
	for !gotFlags {
		messages, err := client2.GetPendingMessages(ctx)
		if err != nil {
			t.Error(err)
			if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
				break
			}
		}

		receivedMessages = append(receivedMessages, messages...)
		for _, msg := range messages {
			if msg.Type != "event" || msg.Event.Target != "participants" || msg.Event.Type != "flags" {
				continue
			}

			if msg.Event.Flags.RoomId != roomId {
				t.Errorf("Expected flags in room %s, got %s", roomId, msg.Event.Flags.RoomId)
			} else if msg.Event.Flags.SessionId != sessionId {
				t.Errorf("Expected flags for session %s, got %s", sessionId, msg.Event.Flags.SessionId)
			} else if msg.Event.Flags.Flags != newFlags {
				t.Errorf("Expected flags %d, got %d", newFlags, msg.Event.Flags.Flags)
			} else {
				gotFlags = true
				break
			}
		}
	}
	if !gotFlags {
		t.Errorf("Didn't receive initial flags in %+v", receivedMessages)
	}

	// Ignore "join" messages from second client
	if err := client.DrainMessages(ctx); err != nil {
		t.Error(err)
	}

	// When sending to a virtual session, the message is sent to the actual
	// client and contains a "Recipient" block with the internal session id.
	recipient := MessageClientMessageRecipient{
		Type:      "session",
		SessionId: sessionId,
	}

	data := "from-client-to-virtual"
	if err := client.SendMessage(recipient, data); err != nil {
		t.Fatal(err)
	}

	msg2, err = clientInternal.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	} else if err := checkMessageType(msg2, "message"); err != nil {
		t.Fatal(err)
	} else if err := checkMessageSender(hub, msg2.Message.Sender, "session", hello.Hello); err != nil {
		t.Error(err)
	}

	if msg2.Message.Recipient == nil {
		t.Errorf("Expected recipient, got none")
	} else if msg2.Message.Recipient.Type != "session" {
		t.Errorf("Expected recipient type session, got %s", msg2.Message.Recipient.Type)
	} else if msg2.Message.Recipient.SessionId != internalSessionId {
		t.Errorf("Expected recipient %s, got %s", internalSessionId, msg2.Message.Recipient.SessionId)
	}

	var payload string
	if err := json.Unmarshal(*msg2.Message.Data, &payload); err != nil {
		t.Error(err)
	} else if payload != data {
		t.Errorf("Expected payload %s, got %s", data, payload)
	}

	msgRemove := &ClientMessage{
		Type: "internal",
		Internal: &InternalClientMessage{
			Type: "removesession",
			RemoveSession: &RemoveSessionInternalClientMessage{
				CommonSessionInternalClientMessage: CommonSessionInternalClientMessage{
					SessionId: internalSessionId,
					RoomId:    roomId,
				},
			},
		},
	}
	if err := clientInternal.WriteJSON(msgRemove); err != nil {
		t.Fatal(err)
	}

	msg5, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err := client.checkMessageRoomLeaveSession(msg5, sessionId); err != nil {
		t.Error(err)
	}
}

func checkHasEntryWithInCall(message *RoomEventServerMessage, sessionId string, entryType string, inCall int) error {
	found := false
	for _, entry := range message.Users {
		if sid, ok := entry["sessionId"].(string); ok && sid == sessionId {
			if value, ok := entry[entryType].(bool); !ok || !value {
				return fmt.Errorf("Expected %s user, got %+v", entryType, entry)
			}

			if value, ok := entry["inCall"].(float64); !ok || int(value) != inCall {
				return fmt.Errorf("Expected in call %d, got %+v", inCall, entry)
			}
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("No user with session id %s found, got %+v", sessionId, message)
	}

	return nil
}

func TestVirtualSessionCustomInCall(t *testing.T) {
	t.Parallel()
	CatchLogForTest(t)
	hub, _, _, server := CreateHubForTest(t)

	roomId := "the-room-id"
	emptyProperties := json.RawMessage("{}")
	backend := &Backend{
		id:     "compat",
		compat: true,
	}
	room, err := hub.createRoom(roomId, &emptyProperties, backend)
	if err != nil {
		t.Fatalf("Could not create room: %s", err)
	}
	defer room.Close()

	clientInternal := NewTestClient(t, server, hub)
	defer clientInternal.CloseWithBye()
	features := []string{
		ClientFeatureInternalInCall,
	}
	if err := clientInternal.SendHelloInternalWithFeatures(features); err != nil {
		t.Fatal(err)
	}

	client := NewTestClient(t, server, hub)
	defer client.CloseWithBye()
	if err := client.SendHello(testDefaultUserId); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), testTimeout)
	defer cancel()

	helloInternal, err := clientInternal.RunUntilHello(ctx)
	if err != nil {
		t.Error(err)
	} else {
		if helloInternal.Hello.UserId != "" {
			t.Errorf("Expected empty user id, got %+v", helloInternal.Hello)
		}
		if helloInternal.Hello.SessionId == "" {
			t.Errorf("Expected session id, got %+v", helloInternal.Hello)
		}
		if helloInternal.Hello.ResumeId == "" {
			t.Errorf("Expected resume id, got %+v", helloInternal.Hello)
		}
	}
	if room, err := clientInternal.JoinRoomWithRoomSession(ctx, roomId, ""); err != nil {
		t.Fatal(err)
	} else if room.Room.RoomId != roomId {
		t.Fatalf("Expected room %s, got %s", roomId, room.Room.RoomId)
	}

	hello, err := client.RunUntilHello(ctx)
	if err != nil {
		t.Error(err)
	}
	if room, err := client.JoinRoom(ctx, roomId); err != nil {
		t.Fatal(err)
	} else if room.Room.RoomId != roomId {
		t.Fatalf("Expected room %s, got %s", roomId, room.Room.RoomId)
	}

	if _, additional, err := clientInternal.RunUntilJoinedAndReturn(ctx, helloInternal.Hello, hello.Hello); err != nil {
		t.Error(err)
	} else if len(additional) != 1 {
		t.Errorf("expected one additional message, got %+v", additional)
	} else if additional[0].Type != "event" {
		t.Errorf("expected event message, got %+v", additional[0])
	} else if additional[0].Event.Target != "participants" {
		t.Errorf("expected event participants message, got %+v", additional[0])
	} else if additional[0].Event.Type != "update" {
		t.Errorf("expected event participants update message, got %+v", additional[0])
	} else if additional[0].Event.Update.Users[0]["sessionId"].(string) != helloInternal.Hello.SessionId {
		t.Errorf("expected event update message for internal session, got %+v", additional[0])
	} else if additional[0].Event.Update.Users[0]["inCall"].(float64) != 0 {
		t.Errorf("expected event update message with session not in call, got %+v", additional[0])
	}
	if err := client.RunUntilJoined(ctx, helloInternal.Hello, hello.Hello); err != nil {
		t.Error(err)
	}

	internalSessionId := "session1"
	userId := "user1"
	msgAdd := &ClientMessage{
		Type: "internal",
		Internal: &InternalClientMessage{
			Type: "addsession",
			AddSession: &AddSessionInternalClientMessage{
				CommonSessionInternalClientMessage: CommonSessionInternalClientMessage{
					SessionId: internalSessionId,
					RoomId:    roomId,
				},
				UserId: userId,
				Flags:  FLAG_MUTED_SPEAKING,
			},
		},
	}
	if err := clientInternal.WriteJSON(msgAdd); err != nil {
		t.Fatal(err)
	}

	msg1, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	// The public session id will be generated by the server, so don't check for it.
	if err := client.checkMessageJoinedSession(msg1, "", userId); err != nil {
		t.Fatal(err)
	}
	sessionId := msg1.Event.Join[0].SessionId
	session := hub.GetSessionByPublicId(sessionId)
	if session == nil {
		t.Fatalf("Could not get virtual session %s", sessionId)
	}
	if session.ClientType() != HelloClientTypeVirtual {
		t.Errorf("Expected client type %s, got %s", HelloClientTypeVirtual, session.ClientType())
	}
	if sid := session.(*VirtualSession).SessionId(); sid != internalSessionId {
		t.Errorf("Expected internal session id %s, got %s", internalSessionId, sid)
	}

	// Also a participants update event will be triggered for the virtual user.
	msg2, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	updateMsg, err := checkMessageParticipantsInCall(msg2)
	if err != nil {
		t.Error(err)
	} else if updateMsg.RoomId != roomId {
		t.Errorf("Expected room %s, got %s", roomId, updateMsg.RoomId)
	} else if len(updateMsg.Users) != 2 {
		t.Errorf("Expected two users, got %+v", updateMsg.Users)
	}

	if err := checkHasEntryWithInCall(updateMsg, sessionId, "virtual", 0); err != nil {
		t.Error(err)
	}
	if err := checkHasEntryWithInCall(updateMsg, helloInternal.Hello.SessionId, "internal", 0); err != nil {
		t.Error(err)
	}

	msg3, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}

	flagsMsg, err := checkMessageParticipantFlags(msg3)
	if err != nil {
		t.Error(err)
	} else if flagsMsg.RoomId != roomId {
		t.Errorf("Expected room %s, got %s", roomId, flagsMsg.RoomId)
	} else if flagsMsg.SessionId != sessionId {
		t.Errorf("Expected session id %s, got %s", sessionId, flagsMsg.SessionId)
	} else if flagsMsg.Flags != FLAG_MUTED_SPEAKING {
		t.Errorf("Expected flags %d, got %+v", FLAG_MUTED_SPEAKING, flagsMsg.Flags)
	}

	// The internal session can change its "inCall" flags
	msgInCall := &ClientMessage{
		Type: "internal",
		Internal: &InternalClientMessage{
			Type: "incall",
			InCall: &InCallInternalClientMessage{
				InCall: FlagInCall | FlagWithAudio,
			},
		},
	}
	if err := clientInternal.WriteJSON(msgInCall); err != nil {
		t.Fatal(err)
	}

	msg4, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	updateMsg2, err := checkMessageParticipantsInCall(msg4)
	if err != nil {
		t.Error(err)
	} else if updateMsg2.RoomId != roomId {
		t.Errorf("Expected room %s, got %s", roomId, updateMsg2.RoomId)
	} else if len(updateMsg2.Users) != 2 {
		t.Errorf("Expected two users, got %+v", updateMsg2.Users)
	}
	if err := checkHasEntryWithInCall(updateMsg2, sessionId, "virtual", 0); err != nil {
		t.Error(err)
	}
	if err := checkHasEntryWithInCall(updateMsg2, helloInternal.Hello.SessionId, "internal", FlagInCall|FlagWithAudio); err != nil {
		t.Error(err)
	}

	// The internal session can change the "inCall" flags of a virtual session
	newInCall := FlagInCall | FlagWithPhone
	msgInCall2 := &ClientMessage{
		Type: "internal",
		Internal: &InternalClientMessage{
			Type: "updatesession",
			UpdateSession: &UpdateSessionInternalClientMessage{
				CommonSessionInternalClientMessage: CommonSessionInternalClientMessage{
					SessionId: internalSessionId,
					RoomId:    roomId,
				},
				InCall: &newInCall,
			},
		},
	}
	if err := clientInternal.WriteJSON(msgInCall2); err != nil {
		t.Fatal(err)
	}

	msg5, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	updateMsg3, err := checkMessageParticipantsInCall(msg5)
	if err != nil {
		t.Error(err)
	} else if updateMsg3.RoomId != roomId {
		t.Errorf("Expected room %s, got %s", roomId, updateMsg3.RoomId)
	} else if len(updateMsg3.Users) != 2 {
		t.Errorf("Expected two users, got %+v", updateMsg3.Users)
	}
	if err := checkHasEntryWithInCall(updateMsg3, sessionId, "virtual", newInCall); err != nil {
		t.Error(err)
	}
	if err := checkHasEntryWithInCall(updateMsg3, helloInternal.Hello.SessionId, "internal", FlagInCall|FlagWithAudio); err != nil {
		t.Error(err)
	}
}

func TestVirtualSessionCleanup(t *testing.T) {
	t.Parallel()
	CatchLogForTest(t)
	hub, _, _, server := CreateHubForTest(t)

	roomId := "the-room-id"
	emptyProperties := json.RawMessage("{}")
	backend := &Backend{
		id:     "compat",
		compat: true,
	}
	room, err := hub.createRoom(roomId, &emptyProperties, backend)
	if err != nil {
		t.Fatalf("Could not create room: %s", err)
	}
	defer room.Close()

	clientInternal := NewTestClient(t, server, hub)
	defer clientInternal.CloseWithBye()
	if err := clientInternal.SendHelloInternal(); err != nil {
		t.Fatal(err)
	}

	client := NewTestClient(t, server, hub)
	defer client.CloseWithBye()
	if err := client.SendHello(testDefaultUserId); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), testTimeout)
	defer cancel()

	if hello, err := clientInternal.RunUntilHello(ctx); err != nil {
		t.Error(err)
	} else {
		if hello.Hello.UserId != "" {
			t.Errorf("Expected empty user id, got %+v", hello.Hello)
		}
		if hello.Hello.SessionId == "" {
			t.Errorf("Expected session id, got %+v", hello.Hello)
		}
		if hello.Hello.ResumeId == "" {
			t.Errorf("Expected resume id, got %+v", hello.Hello)
		}
	}
	if _, err := client.RunUntilHello(ctx); err != nil {
		t.Error(err)
	}

	if room, err := client.JoinRoom(ctx, roomId); err != nil {
		t.Fatal(err)
	} else if room.Room.RoomId != roomId {
		t.Fatalf("Expected room %s, got %s", roomId, room.Room.RoomId)
	}

	// Ignore "join" events.
	if err := client.DrainMessages(ctx); err != nil {
		t.Error(err)
	}

	internalSessionId := "session1"
	userId := "user1"
	msgAdd := &ClientMessage{
		Type: "internal",
		Internal: &InternalClientMessage{
			Type: "addsession",
			AddSession: &AddSessionInternalClientMessage{
				CommonSessionInternalClientMessage: CommonSessionInternalClientMessage{
					SessionId: internalSessionId,
					RoomId:    roomId,
				},
				UserId: userId,
				Flags:  FLAG_MUTED_SPEAKING,
			},
		},
	}
	if err := clientInternal.WriteJSON(msgAdd); err != nil {
		t.Fatal(err)
	}

	msg1, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	// The public session id will be generated by the server, so don't check for it.
	if err := client.checkMessageJoinedSession(msg1, "", userId); err != nil {
		t.Fatal(err)
	}
	sessionId := msg1.Event.Join[0].SessionId
	session := hub.GetSessionByPublicId(sessionId)
	if session == nil {
		t.Fatalf("Could not get virtual session %s", sessionId)
	}
	if session.ClientType() != HelloClientTypeVirtual {
		t.Errorf("Expected client type %s, got %s", HelloClientTypeVirtual, session.ClientType())
	}
	if sid := session.(*VirtualSession).SessionId(); sid != internalSessionId {
		t.Errorf("Expected internal session id %s, got %s", internalSessionId, sid)
	}

	// Also a participants update event will be triggered for the virtual user.
	msg2, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	updateMsg, err := checkMessageParticipantsInCall(msg2)
	if err != nil {
		t.Error(err)
	} else if updateMsg.RoomId != roomId {
		t.Errorf("Expected room %s, got %s", roomId, updateMsg.RoomId)
	} else if len(updateMsg.Users) != 1 {
		t.Errorf("Expected one user, got %+v", updateMsg.Users)
	} else if sid, ok := updateMsg.Users[0]["sessionId"].(string); !ok || sid != sessionId {
		t.Errorf("Expected session id %s, got %+v", sessionId, updateMsg.Users[0])
	} else if virtual, ok := updateMsg.Users[0]["virtual"].(bool); !ok || !virtual {
		t.Errorf("Expected virtual user, got %+v", updateMsg.Users[0])
	} else if inCall, ok := updateMsg.Users[0]["inCall"].(float64); !ok || inCall != (FlagInCall|FlagWithPhone) {
		t.Errorf("Expected user in call with phone, got %+v", updateMsg.Users[0])
	}

	msg3, err := client.RunUntilMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}

	flagsMsg, err := checkMessageParticipantFlags(msg3)
	if err != nil {
		t.Error(err)
	} else if flagsMsg.RoomId != roomId {
		t.Errorf("Expected room %s, got %s", roomId, flagsMsg.RoomId)
	} else if flagsMsg.SessionId != sessionId {
		t.Errorf("Expected session id %s, got %s", sessionId, flagsMsg.SessionId)
	} else if flagsMsg.Flags != FLAG_MUTED_SPEAKING {
		t.Errorf("Expected flags %d, got %+v", FLAG_MUTED_SPEAKING, flagsMsg.Flags)
	}

	// The virtual sessions are closed when the parent session is deleted.
	clientInternal.CloseWithBye()

	if msg2, err := client.RunUntilMessage(ctx); err != nil {
		t.Fatal(err)
	} else if err := client.checkMessageRoomLeaveSession(msg2, sessionId); err != nil {
		t.Error(err)
	}
}
