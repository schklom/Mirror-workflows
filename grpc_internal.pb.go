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
// source: grpc_internal.proto

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

type GetServerIdRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *GetServerIdRequest) Reset() {
	*x = GetServerIdRequest{}
	mi := &file_grpc_internal_proto_msgTypes[0]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GetServerIdRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetServerIdRequest) ProtoMessage() {}

func (x *GetServerIdRequest) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_internal_proto_msgTypes[0]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use GetServerIdRequest.ProtoReflect.Descriptor instead.
func (*GetServerIdRequest) Descriptor() ([]byte, []int) {
	return file_grpc_internal_proto_rawDescGZIP(), []int{0}
}

type GetServerIdReply struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	ServerId      string                 `protobuf:"bytes,1,opt,name=serverId,proto3" json:"serverId,omitempty"`
	Version       string                 `protobuf:"bytes,2,opt,name=version,proto3" json:"version,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *GetServerIdReply) Reset() {
	*x = GetServerIdReply{}
	mi := &file_grpc_internal_proto_msgTypes[1]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GetServerIdReply) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetServerIdReply) ProtoMessage() {}

func (x *GetServerIdReply) ProtoReflect() protoreflect.Message {
	mi := &file_grpc_internal_proto_msgTypes[1]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use GetServerIdReply.ProtoReflect.Descriptor instead.
func (*GetServerIdReply) Descriptor() ([]byte, []int) {
	return file_grpc_internal_proto_rawDescGZIP(), []int{1}
}

func (x *GetServerIdReply) GetServerId() string {
	if x != nil {
		return x.ServerId
	}
	return ""
}

func (x *GetServerIdReply) GetVersion() string {
	if x != nil {
		return x.Version
	}
	return ""
}

var File_grpc_internal_proto protoreflect.FileDescriptor

const file_grpc_internal_proto_rawDesc = "" +
	"\n" +
	"\x13grpc_internal.proto\x12\tsignaling\"\x14\n" +
	"\x12GetServerIdRequest\"H\n" +
	"\x10GetServerIdReply\x12\x1a\n" +
	"\bserverId\x18\x01 \x01(\tR\bserverId\x12\x18\n" +
	"\aversion\x18\x02 \x01(\tR\aversion2Z\n" +
	"\vRpcInternal\x12K\n" +
	"\vGetServerId\x12\x1d.signaling.GetServerIdRequest\x1a\x1b.signaling.GetServerIdReply\"\x00B<Z:github.com/strukturag/nextcloud-spreed-signaling;signalingb\x06proto3"

var (
	file_grpc_internal_proto_rawDescOnce sync.Once
	file_grpc_internal_proto_rawDescData []byte
)

func file_grpc_internal_proto_rawDescGZIP() []byte {
	file_grpc_internal_proto_rawDescOnce.Do(func() {
		file_grpc_internal_proto_rawDescData = protoimpl.X.CompressGZIP(unsafe.Slice(unsafe.StringData(file_grpc_internal_proto_rawDesc), len(file_grpc_internal_proto_rawDesc)))
	})
	return file_grpc_internal_proto_rawDescData
}

var file_grpc_internal_proto_msgTypes = make([]protoimpl.MessageInfo, 2)
var file_grpc_internal_proto_goTypes = []any{
	(*GetServerIdRequest)(nil), // 0: signaling.GetServerIdRequest
	(*GetServerIdReply)(nil),   // 1: signaling.GetServerIdReply
}
var file_grpc_internal_proto_depIdxs = []int32{
	0, // 0: signaling.RpcInternal.GetServerId:input_type -> signaling.GetServerIdRequest
	1, // 1: signaling.RpcInternal.GetServerId:output_type -> signaling.GetServerIdReply
	1, // [1:2] is the sub-list for method output_type
	0, // [0:1] is the sub-list for method input_type
	0, // [0:0] is the sub-list for extension type_name
	0, // [0:0] is the sub-list for extension extendee
	0, // [0:0] is the sub-list for field type_name
}

func init() { file_grpc_internal_proto_init() }
func file_grpc_internal_proto_init() {
	if File_grpc_internal_proto != nil {
		return
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: unsafe.Slice(unsafe.StringData(file_grpc_internal_proto_rawDesc), len(file_grpc_internal_proto_rawDesc)),
			NumEnums:      0,
			NumMessages:   2,
			NumExtensions: 0,
			NumServices:   1,
		},
		GoTypes:           file_grpc_internal_proto_goTypes,
		DependencyIndexes: file_grpc_internal_proto_depIdxs,
		MessageInfos:      file_grpc_internal_proto_msgTypes,
	}.Build()
	File_grpc_internal_proto = out.File
	file_grpc_internal_proto_goTypes = nil
	file_grpc_internal_proto_depIdxs = nil
}
