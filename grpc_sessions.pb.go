//*
// Standalone signaling server for the Nextcloud Spreed app.
// Copyright (C) 2022 struktur AG
//
// @author Joachim Bauch <bauch@struktur.de>
//
// @license GNU AGPL version 3 or any later version
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Code generated by protoc-gen-go. DO NOT EDIT.
// source: grpc_sessions.proto

package signaling

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
	unsafe "unsafe"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type LookupResumeIdRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	ResumeId      string                 `protobuf:"bytes,1,opt,name=resumeId,proto3" json:"resumeId,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *LookupResumeIdRequest) Reset() {
	*x = LookupResumeIdRequest{}
	mi := &file_grpc_sessions_proto_msgTypes[0]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *LookupResumeIdRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*LookupResumeIdRequest) ProtoMessage() {}

func (x *LookupResumeIdRequest) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[0]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use LookupResumeIdRequest.ProtoReflect.Descriptor instead.
func (*LookupResumeIdRequest) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{0}
}

func (x *LookupResumeIdRequest) GetResumeId() string {
	if x != nil {
		return x.ResumeId
	}
	return ""
}

type LookupResumeIdReply struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	SessionId     string                 `protobuf:"bytes,1,opt,name=sessionId,proto3" json:"sessionId,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *LookupResumeIdReply) Reset() {
	*x = LookupResumeIdReply{}
	mi := &file_grpc_sessions_proto_msgTypes[1]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *LookupResumeIdReply) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*LookupResumeIdReply) ProtoMessage() {}

func (x *LookupResumeIdReply) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[1]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use LookupResumeIdReply.ProtoReflect.Descriptor instead.
func (*LookupResumeIdReply) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{1}
}

func (x *LookupResumeIdReply) GetSessionId() string {
	if x != nil {
		return x.SessionId
	}
	return ""
}

type LookupSessionIdRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	RoomSessionId string                 `protobuf:"bytes,1,opt,name=roomSessionId,proto3" json:"roomSessionId,omitempty"`
	// Optional: set if the session should be disconnected with a given reason.
	DisconnectReason string `protobuf:"bytes,2,opt,name=disconnectReason,proto3" json:"disconnectReason,omitempty"`
	unknownFields    protoimpl.UnknownFields
	sizeCache        protoimpl.SizeCache
}

func (x *LookupSessionIdRequest) Reset() {
	*x = LookupSessionIdRequest{}
	mi := &file_grpc_sessions_proto_msgTypes[2]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *LookupSessionIdRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*LookupSessionIdRequest) ProtoMessage() {}

func (x *LookupSessionIdRequest) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[2]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use LookupSessionIdRequest.ProtoReflect.Descriptor instead.
func (*LookupSessionIdRequest) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{2}
}

func (x *LookupSessionIdRequest) GetRoomSessionId() string {
	if x != nil {
		return x.RoomSessionId
	}
	return ""
}

func (x *LookupSessionIdRequest) GetDisconnectReason() string {
	if x != nil {
		return x.DisconnectReason
	}
	return ""
}

type LookupSessionIdReply struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	SessionId     string                 `protobuf:"bytes,1,opt,name=sessionId,proto3" json:"sessionId,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *LookupSessionIdReply) Reset() {
	*x = LookupSessionIdReply{}
	mi := &file_grpc_sessions_proto_msgTypes[3]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *LookupSessionIdReply) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*LookupSessionIdReply) ProtoMessage() {}

func (x *LookupSessionIdReply) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[3]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use LookupSessionIdReply.ProtoReflect.Descriptor instead.
func (*LookupSessionIdReply) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{3}
}

func (x *LookupSessionIdReply) GetSessionId() string {
	if x != nil {
		return x.SessionId
	}
	return ""
}

type IsSessionInCallRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	SessionId     string                 `protobuf:"bytes,1,opt,name=sessionId,proto3" json:"sessionId,omitempty"`
	RoomId        string                 `protobuf:"bytes,2,opt,name=roomId,proto3" json:"roomId,omitempty"`
	BackendUrl    string                 `protobuf:"bytes,3,opt,name=backendUrl,proto3" json:"backendUrl,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *IsSessionInCallRequest) Reset() {
	*x = IsSessionInCallRequest{}
	mi := &file_grpc_sessions_proto_msgTypes[4]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *IsSessionInCallRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*IsSessionInCallRequest) ProtoMessage() {}

func (x *IsSessionInCallRequest) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[4]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use IsSessionInCallRequest.ProtoReflect.Descriptor instead.
func (*IsSessionInCallRequest) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{4}
}

func (x *IsSessionInCallRequest) GetSessionId() string {
	if x != nil {
		return x.SessionId
	}
	return ""
}

func (x *IsSessionInCallRequest) GetRoomId() string {
	if x != nil {
		return x.RoomId
	}
	return ""
}

func (x *IsSessionInCallRequest) GetBackendUrl() string {
	if x != nil {
		return x.BackendUrl
	}
	return ""
}

type IsSessionInCallReply struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	InCall        bool                   `protobuf:"varint,1,opt,name=inCall,proto3" json:"inCall,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *IsSessionInCallReply) Reset() {
	*x = IsSessionInCallReply{}
	mi := &file_grpc_sessions_proto_msgTypes[5]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *IsSessionInCallReply) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*IsSessionInCallReply) ProtoMessage() {}

func (x *IsSessionInCallReply) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[5]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use IsSessionInCallReply.ProtoReflect.Descriptor instead.
func (*IsSessionInCallReply) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{5}
}

func (x *IsSessionInCallReply) GetInCall() bool {
	if x != nil {
		return x.InCall
	}
	return false
}

type GetInternalSessionsRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	RoomId        string                 `protobuf:"bytes,1,opt,name=roomId,proto3" json:"roomId,omitempty"`
	BackendUrl    string                 `protobuf:"bytes,2,opt,name=backendUrl,proto3" json:"backendUrl,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *GetInternalSessionsRequest) Reset() {
	*x = GetInternalSessionsRequest{}
	mi := &file_grpc_sessions_proto_msgTypes[6]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GetInternalSessionsRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetInternalSessionsRequest) ProtoMessage() {}

func (x *GetInternalSessionsRequest) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[6]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use GetInternalSessionsRequest.ProtoReflect.Descriptor instead.
func (*GetInternalSessionsRequest) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{6}
}

func (x *GetInternalSessionsRequest) GetRoomId() string {
	if x != nil {
		return x.RoomId
	}
	return ""
}

func (x *GetInternalSessionsRequest) GetBackendUrl() string {
	if x != nil {
		return x.BackendUrl
	}
	return ""
}

type InternalSessionData struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	SessionId     string                 `protobuf:"bytes,1,opt,name=sessionId,proto3" json:"sessionId,omitempty"`
	InCall        uint32                 `protobuf:"varint,2,opt,name=inCall,proto3" json:"inCall,omitempty"`
	Features      []string               `protobuf:"bytes,3,rep,name=features,proto3" json:"features,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *InternalSessionData) Reset() {
	*x = InternalSessionData{}
	mi := &file_grpc_sessions_proto_msgTypes[7]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *InternalSessionData) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*InternalSessionData) ProtoMessage() {}

func (x *InternalSessionData) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[7]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use InternalSessionData.ProtoReflect.Descriptor instead.
func (*InternalSessionData) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{7}
}

func (x *InternalSessionData) GetSessionId() string {
	if x != nil {
		return x.SessionId
	}
	return ""
}

func (x *InternalSessionData) GetInCall() uint32 {
	if x != nil {
		return x.InCall
	}
	return 0
}

func (x *InternalSessionData) GetFeatures() []string {
	if x != nil {
		return x.Features
	}
	return nil
}

type VirtualSessionData struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	SessionId     string                 `protobuf:"bytes,1,opt,name=sessionId,proto3" json:"sessionId,omitempty"`
	InCall        uint32                 `protobuf:"varint,2,opt,name=inCall,proto3" json:"inCall,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *VirtualSessionData) Reset() {
	*x = VirtualSessionData{}
	mi := &file_grpc_sessions_proto_msgTypes[8]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *VirtualSessionData) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*VirtualSessionData) ProtoMessage() {}

func (x *VirtualSessionData) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[8]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use VirtualSessionData.ProtoReflect.Descriptor instead.
func (*VirtualSessionData) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{8}
}

func (x *VirtualSessionData) GetSessionId() string {
	if x != nil {
		return x.SessionId
	}
	return ""
}

func (x *VirtualSessionData) GetInCall() uint32 {
	if x != nil {
		return x.InCall
	}
	return 0
}

type GetInternalSessionsReply struct {
	state            protoimpl.MessageState `protogen:"open.v1"`
	InternalSessions []*InternalSessionData `protobuf:"bytes,1,rep,name=internalSessions,proto3" json:"internalSessions,omitempty"`
	VirtualSessions  []*VirtualSessionData  `protobuf:"bytes,2,rep,name=virtualSessions,proto3" json:"virtualSessions,omitempty"`
	unknownFields    protoimpl.UnknownFields
	sizeCache        protoimpl.SizeCache
}

func (x *GetInternalSessionsReply) Reset() {
	*x = GetInternalSessionsReply{}
	mi := &file_grpc_sessions_proto_msgTypes[9]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GetInternalSessionsReply) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetInternalSessionsReply) ProtoMessage() {}

func (x *GetInternalSessionsReply) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[9]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use GetInternalSessionsReply.ProtoReflect.Descriptor instead.
func (*GetInternalSessionsReply) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{9}
}

func (x *GetInternalSessionsReply) GetInternalSessions() []*InternalSessionData {
	if x != nil {
		return x.InternalSessions
	}
	return nil
}

func (x *GetInternalSessionsReply) GetVirtualSessions() []*VirtualSessionData {
	if x != nil {
		return x.VirtualSessions
	}
	return nil
}

type ClientSessionMessage struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Message       []byte                 `protobuf:"bytes,1,opt,name=message,proto3" json:"message,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *ClientSessionMessage) Reset() {
	*x = ClientSessionMessage{}
	mi := &file_grpc_sessions_proto_msgTypes[10]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ClientSessionMessage) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ClientSessionMessage) ProtoMessage() {}

func (x *ClientSessionMessage) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[10]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ClientSessionMessage.ProtoReflect.Descriptor instead.
func (*ClientSessionMessage) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{10}
}

func (x *ClientSessionMessage) GetMessage() []byte {
	if x != nil {
		return x.Message
	}
	return nil
}

type ServerSessionMessage struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Message       []byte                 `protobuf:"bytes,1,opt,name=message,proto3" json:"message,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *ServerSessionMessage) Reset() {
	*x = ServerSessionMessage{}
	mi := &file_grpc_sessions_proto_msgTypes[11]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ServerSessionMessage) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ServerSessionMessage) ProtoMessage() {}

func (x *ServerSessionMessage) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_sessions_proto_msgTypes[11]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ServerSessionMessage.ProtoReflect.Descriptor instead.
func (*ServerSessionMessage) Descriptor() ([]byte, []int) {
	return file_grpc_sessions_proto_rawDescGZIP(), []int{11}
}

func (x *ServerSessionMessage) GetMessage() []byte {
	if x != nil {
		return x.Message
	}
	return nil
}

var File_grpc_sessions_proto protoreflect.FileDescriptor

const file_grpc_sessions_proto_rawDesc = "" +
	"\n" +
	"\x13grpc_sessions.proto\x12\tsignaling\"3\n" +
	"\x15LookupResumeIdRequest\x12\x1a\n" +
	"\bresumeId\x18\x01 \x01(\tR\bresumeId\"3\n" +
	"\x13LookupResumeIdReply\x12\x1c\n" +
	"\tsessionId\x18\x01 \x01(\tR\tsessionId\"j\n" +
	"\x16LookupSessionIdRequest\x12$\n" +
	"\rroomSessionId\x18\x01 \x01(\tR\rroomSessionId\x12*\n" +
	"\x10disconnectReason\x18\x02 \x01(\tR\x10disconnectReason\"4\n" +
	"\x14LookupSessionIdReply\x12\x1c\n" +
	"\tsessionId\x18\x01 \x01(\tR\tsessionId\"n\n" +
	"\x16IsSessionInCallRequest\x12\x1c\n" +
	"\tsessionId\x18\x01 \x01(\tR\tsessionId\x12\x16\n" +
	"\x06roomId\x18\x02 \x01(\tR\x06roomId\x12\x1e\n" +
	"\n" +
	"backendUrl\x18\x03 \x01(\tR\n" +
	"backendUrl\".\n" +
	"\x14IsSessionInCallReply\x12\x16\n" +
	"\x06inCall\x18\x01 \x01(\bR\x06inCall\"T\n" +
	"\x1aGetInternalSessionsRequest\x12\x16\n" +
	"\x06roomId\x18\x01 \x01(\tR\x06roomId\x12\x1e\n" +
	"\n" +
	"backendUrl\x18\x02 \x01(\tR\n" +
	"backendUrl\"g\n" +
	"\x13InternalSessionData\x12\x1c\n" +
	"\tsessionId\x18\x01 \x01(\tR\tsessionId\x12\x16\n" +
	"\x06inCall\x18\x02 \x01(\rR\x06inCall\x12\x1a\n" +
	"\bfeatures\x18\x03 \x03(\tR\bfeatures\"J\n" +
	"\x12VirtualSessionData\x12\x1c\n" +
	"\tsessionId\x18\x01 \x01(\tR\tsessionId\x12\x16\n" +
	"\x06inCall\x18\x02 \x01(\rR\x06inCall\"\xaf\x01\n" +
	"\x18GetInternalSessionsReply\x12J\n" +
	"\x10internalSessions\x18\x01 \x03(\v2\x1e.signaling.InternalSessionDataR\x10internalSessions\x12G\n" +
	"\x0fvirtualSessions\x18\x02 \x03(\v2\x1d.signaling.VirtualSessionDataR\x0fvirtualSessions\"0\n" +
	"\x14ClientSessionMessage\x12\x18\n" +
	"\amessage\x18\x01 \x01(\fR\amessage\"0\n" +
	"\x14ServerSessionMessage\x12\x18\n" +
	"\amessage\x18\x01 \x01(\fR\amessage2\xd2\x03\n" +
	"\vRpcSessions\x12T\n" +
	"\x0eLookupResumeId\x12 .signaling.LookupResumeIdRequest\x1a\x1e.signaling.LookupResumeIdReply\"\x00\x12W\n" +
	"\x0fLookupSessionId\x12!.signaling.LookupSessionIdRequest\x1a\x1f.signaling.LookupSessionIdReply\"\x00\x12W\n" +
	"\x0fIsSessionInCall\x12!.signaling.IsSessionInCallRequest\x1a\x1f.signaling.IsSessionInCallReply\"\x00\x12c\n" +
	"\x13GetInternalSessions\x12%.signaling.GetInternalSessionsRequest\x1a#.signaling.GetInternalSessionsReply\"\x00\x12V\n" +
	"\fProxySession\x12\x1f.signaling.ClientSessionMessage\x1a\x1f.signaling.ServerSessionMessage\"\x00(\x010\x01B<Z:github.com/strukturag/nextcloud-spreed-signaling;signalingb\x06proto3"

var (
	file_grpc_sessions_proto_rawDescOnce sync.Once
	file_grpc_sessions_proto_rawDescData []byte
)

func file_grpc_sessions_proto_rawDescGZIP() []byte {
	file_grpc_sessions_proto_rawDescOnce.Do(func() {
		file_grpc_sessions_proto_rawDescData = protoimpl.X.CompressGZIP(unsafe.Slice(unsafe.StringData(file_grpc_sessions_proto_rawDesc), len(file_grpc_sessions_proto_rawDesc)))
	})
	return file_grpc_sessions_proto_rawDescData
}

var file_grpc_sessions_proto_msgTypes = make([]protoimpl.MessageInfo, 12)
var file_grpc_sessions_proto_goTypes = []any{
	(*LookupResumeIdRequest)(nil),      // 0: signaling.LookupResumeIdRequest
	(*LookupResumeIdReply)(nil),        // 1: signaling.LookupResumeIdReply
	(*LookupSessionIdRequest)(nil),     // 2: signaling.LookupSessionIdRequest
	(*LookupSessionIdReply)(nil),       // 3: signaling.LookupSessionIdReply
	(*IsSessionInCallRequest)(nil),     // 4: signaling.IsSessionInCallRequest
	(*IsSessionInCallReply)(nil),       // 5: signaling.IsSessionInCallReply
	(*GetInternalSessionsRequest)(nil), // 6: signaling.GetInternalSessionsRequest
	(*InternalSessionData)(nil),        // 7: signaling.InternalSessionData
	(*VirtualSessionData)(nil),         // 8: signaling.VirtualSessionData
	(*GetInternalSessionsReply)(nil),   // 9: signaling.GetInternalSessionsReply
	(*ClientSessionMessage)(nil),       // 10: signaling.ClientSessionMessage
	(*ServerSessionMessage)(nil),       // 11: signaling.ServerSessionMessage
}
var file_grpc_sessions_proto_depIdxs = []int32{
	7,  // 0: signaling.GetInternalSessionsReply.internalSessions:type_name -> signaling.InternalSessionData
	8,  // 1: signaling.GetInternalSessionsReply.virtualSessions:type_name -> signaling.VirtualSessionData
	0,  // 2: signaling.RpcSessions.LookupResumeId:input_type -> signaling.LookupResumeIdRequest
	2,  // 3: signaling.RpcSessions.LookupSessionId:input_type -> signaling.LookupSessionIdRequest
	4,  // 4: signaling.RpcSessions.IsSessionInCall:input_type -> signaling.IsSessionInCallRequest
	6,  // 5: signaling.RpcSessions.GetInternalSessions:input_type -> signaling.GetInternalSessionsRequest
	10, // 6: signaling.RpcSessions.ProxySession:input_type -> signaling.ClientSessionMessage
	1,  // 7: signaling.RpcSessions.LookupResumeId:output_type -> signaling.LookupResumeIdReply
	3,  // 8: signaling.RpcSessions.LookupSessionId:output_type -> signaling.LookupSessionIdReply
	5,  // 9: signaling.RpcSessions.IsSessionInCall:output_type -> signaling.IsSessionInCallReply
	9,  // 10: signaling.RpcSessions.GetInternalSessions:output_type -> signaling.GetInternalSessionsReply
	11, // 11: signaling.RpcSessions.ProxySession:output_type -> signaling.ServerSessionMessage
	7,  // [7:12] is the sub-list for method output_type
	2,  // [2:7] is the sub-list for method input_type
	2,  // [2:2] is the sub-list for extension type_name
	2,  // [2:2] is the sub-list for extension extendee
	0,  // [0:2] is the sub-list for field type_name
}

func init() { file_grpc_sessions_proto_init() }
func file_grpc_sessions_proto_init() {
	if File_grpc_sessions_proto != nil {
		return
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: unsafe.Slice(unsafe.StringData(file_grpc_sessions_proto_rawDesc), len(file_grpc_sessions_proto_rawDesc)),
			NumEnums:      0,
			NumMessages:   12,
			NumExtensions: 0,
			NumServices:   1,
		},
		GoTypes:           file_grpc_sessions_proto_goTypes,
		DependencyIndexes: file_grpc_sessions_proto_depIdxs,
		MessageInfos:      file_grpc_sessions_proto_msgTypes,
	}.Build()
	File_grpc_sessions_proto = out.File
	file_grpc_sessions_proto_goTypes = nil
	file_grpc_sessions_proto_depIdxs = nil
}
