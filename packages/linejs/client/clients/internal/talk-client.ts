// For Talk (talk, group(chat), etc)
import { default as Int64 } from "node-int64";
import type { NestedArray, ProtocolKey } from "../../libs/thrift/declares.ts";
import type * as LINETypes from "@evex/linejs-types";
import type { LooseType } from "../../entities/common.ts";
import { ChannelClient } from "./channel-client.ts";
import type { Buffer } from "node:buffer";
import { InternalError } from "../../entities/errors.ts";

export class TalkClient extends ChannelClient {
	public useTalkCache: boolean = false;
	public TalkService_API_PATH = "/S4";
	public TalkService_PROTOCOL_TYPE: ProtocolKey = 4;

	public TalkService_API_PATH_TBINARY = "/S3";

	public TalkService_PROTOCOL_TYPE_TBINARY: ProtocolKey = 4;
	public SyncService_API_PATH = "/SYNC4";
	public SyncService_PROTOCOL_TYPE: ProtocolKey = 4;

	/**
	 * @description Get line events.
	 */
	override sync(
		options: {
			limit?: number;
			revision?: number;
			globalRev?: number;
			individualRev?: number;
			timeout?: number;
		} = {},
	): Promise<LINETypes.SyncResponse> {
		const { limit, revision, individualRev, globalRev, timeout } = {
			limit: 100,
			revision: 0,
			globalRev: 0,
			individualRev: 0,
			timeout: this.longTimeOutMs,
			...options,
		};
		return new Promise<LINETypes.SyncResponse>((resolve) => {
			this.request(
				[
					[10, 1, revision],
					[8, 2, limit],
					[10, 3, globalRev],
					[10, 4, individualRev],
				],
				"sync",
				this.SyncService_PROTOCOL_TYPE,
				"SyncResponse",
				this.SyncService_API_PATH,
				{},
				timeout,
			).then((res) => resolve(res));
		});
	}

	/**
	 * @description Send message to talk.
	 */
	override async sendMessage(options: {
		to: string;
		text?: string;
		contentType?: number;
		contentMetadata?: LooseType;
		relatedMessageId?: string;
		location?: LINETypes.Location;
		chunk?: string[] | Buffer[];
		e2ee?: boolean;
	}): Promise<LINETypes.Message> {
		const {
			to,
			text,
			contentType,
			contentMetadata,
			relatedMessageId,
			location,
			e2ee,
			chunk,
		} = {
			contentType: 0,
			contentMetadata: {},
			//e2ee: true,
			...options,
		};
		if (e2ee && !chunk) {
			const chunk = await this.encryptE2EEMessage(
				to,
				text || location,
				contentType,
			);
			const _contentMetadata = {
				...contentMetadata,
				...{
					e2eeVersion: "2",
					contentType: contentType.toString(),
					e2eeMark: "2",
				},
			};
			const options = {
				to,
				contentType,
				contentMetadata: _contentMetadata,
				relatedMessageId,
				e2ee,
				chunk,
			};
			return this.sendMessage(options);
		}

		const message: NestedArray = [
			[11, 2, to],
			[10, 5, 0], // createdTime
			[10, 6, 0], // deliveredTime
			[2, 14, false], // hasContent
			[8, 15, contentType],
			[13, 18, [11, 11, contentMetadata]],
			[3, 19, 0], // sessionId
		];

		if (text !== undefined) {
			message.push([11, 10, text]);
		}

		if (location !== undefined) {
			const locationObj = [
				[11, 1, location.title || "LINEJS"],
				[11, 2, location.address || "https://github.com/evex-dev/linejs"],
				[4, 3, location.latitude || 0],
				[4, 4, location.longitude || 0],
				[11, 6, location.categoryId || "PC0"],
				[8, 7, location.provider || 2],
			];
			message.push([12, 11, locationObj]);
		}

		if (chunk !== undefined) {
			message.push([15, 20, [11, chunk]]);
		}

		if (relatedMessageId !== undefined) {
			message.push([11, 21, relatedMessageId]);
			message.push([8, 22, 3]); // messageRelationType; FORWARD(0), AUTO_REPLY(1), SUBORDINATE(2), REPLY(3);
			message.push([8, 24, 1]);
		}
		try {
			return this.direct_request(
				[
					[8, 1, this.getReqseq()],
					[12, 2, message],
				],
				"sendMessage",
				this.TalkService_PROTOCOL_TYPE,
				"Message",
				this.TalkService_API_PATH,
			);
		} catch (error) {
			if (
				error instanceof InternalError &&
				(error.data?.code as string).includes("E2EE") &&
				!e2ee
			) {
				options.e2ee = true;
				return this.sendMessage(options);
			} else {
				throw error;
			}
		}
	}

	/**
	 * @description Unsend message.
	 */
	public unsendMessage(options: {
		messageId: string;
	}): Promise<LINETypes.UnsendMessageResponse> {
		const { messageId } = {
			...options,
		};
		return this.direct_request(
			[
				[
					12,
					1,
					[
						[8, 1, 0],
						[11, 2, messageId],
					],
				],
			],
			"unsendMessage",
			this.TalkService_PROTOCOL_TYPE,
			"UnsendMessageResponse",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description React to the message.
	 */
	override reactToMessage(options: {
		messageId: string;
		reactionType: LINETypes.MessageReactionType & number;
	}): Promise<LINETypes.ReactToMessageResponse> {
		const { messageId, reactionType } = {
			...options,
		};
		return this.direct_request(
			[
				[
					[
						12,
						1,
						[
							[8, 1, 0],
							[10, 2, messageId],
							[12, 3, [[8, 1, reactionType]]],
						],
					],
				],
			],
			"reactToMessage",
			this.TalkService_PROTOCOL_TYPE,
			"ReactToMessageResponse",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Will override.
	 */
	public async encryptE2EEMessage(..._arg: LooseType): Promise<LooseType[]> {
		return (await Symbol("Unreachable")) as LooseType;
	}

	public async getE2EEPublicKeys(): Promise<LINETypes.E2EEPublicKey[]> {
		return (
			await this.direct_request(
				[],
				"getE2EEPublicKeys",
				this.TalkService_PROTOCOL_TYPE,
				false,
				this.TalkService_API_PATH,
			)
		).map((e: LooseType) => this.parser.rename_thrift("E2EEPublicKey", e));
	}

	public negotiateE2EEPublicKey(options: {
		mid: string;
	}): Promise<LINETypes.E2EENegotiationResult> {
		const { mid } = { ...options };
		return this.direct_request(
			[[11, 2, mid]],
			"negotiateE2EEPublicKey",
			this.TalkService_PROTOCOL_TYPE,
			"E2EENegotiationResult",
			this.TalkService_API_PATH,
		);
	}

	public getLastE2EEGroupSharedKey(options: {
		keyVersion: number;
		chatMid: string;
	}): Promise<LINETypes.E2EEGroupSharedKey> {
		const { keyVersion, chatMid } = { ...options };
		return this.direct_request(
			[
				[8, 2, keyVersion],
				[11, 3, chatMid],
			],
			"getLastE2EEGroupSharedKey",
			this.TalkService_PROTOCOL_TYPE,
			"E2EEGroupSharedKey",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Mark as read.
	 */
	public sendChatChecked(options: {
		chatMid: string;
		lastMessageId: string;
	}): Promise<void> {
		const { lastMessageId, chatMid } = { ...options };
		return this.direct_request(
			[
				[8, 1, this.getReqseq()],
				[11, 2, chatMid],
				[11, 3, lastMessageId],
			],
			"sendChatChecked",
			this.TalkService_PROTOCOL_TYPE,
			false,
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Get the number of past messages specified by count.
	 * @deprecated Use 'getPreviousMessagesV2WithRequest' instead.
	 */
	public async getPreviousMessagesV2(options: {
		mid: string;
		time: number;
		id: number;
		count?: number;
	}): Promise<LINETypes.Message[]> {
		const { mid, time, id, count } = { count: 100, ...options };
		return (
			await this.direct_request(
				[
					[11, 2, mid],
					[
						12,
						3,
						[
							[10, 1, time],
							[10, 2, id],
						],
					],
					[8, 4, count],
				],
				"getPreviousMessagesV2",
				this.TalkService_PROTOCOL_TYPE,
				false,
				this.TalkService_API_PATH,
			)
		).map((e: LooseType) => this.parser.rename_thrift("Message", e));
	}

	/**
	 * @description Get the number of past messages specified by count.
	 */
	public async getPreviousMessagesV2WithRequest(options: {
		mid: string;
		time: number;
		id: number | bigint | string;
		count?: number;
		withReadCount?: boolean;
		receivedOnly?: boolean;
	}): Promise<LINETypes.Message[]> {
		const { mid, time, id, count, withReadCount, receivedOnly } = {
			count: 100,
			withReadCount: false,
			receivedOnly: false,
			...options,
		};
		const id64 = new Int64(
			(typeof id === "string" ? BigInt(id) : id).toString(16),
		);
		return (
			await this.direct_request(
				[
					[
						12,
						2,
						[
							[11, 1, mid],
							[
								12,
								2,
								[
									[10, 1, time],
									[10, 2, id64],
								],
							],
							[8, 3, count],
							[2, 4, withReadCount],
							[2, 5, receivedOnly],
						],
					],
					[8, 3, 1],
				],
				"getPreviousMessagesV2WithRequest",
				this.TalkService_PROTOCOL_TYPE,
				false,
				this.TalkService_API_PATH,
			)
		).map((e: LooseType) => this.parser.rename_thrift("Message", e));
	}

	/**
	 * @description Get the number of past messages specified by count from the specified chat.
	 */
	public async getRecentMessagesV2(options: {
		to: string;
		count?: number;
	}): Promise<LINETypes.Message[]> {
		const { to, count } = { count: 300, ...options };
		return (
			await this.direct_request(
				[
					[11, 2, to],
					[8, 3, count],
				],
				"getRecentMessagesV2",
				this.TalkService_PROTOCOL_TYPE,
				false,
				this.TalkService_API_PATH,
			)
		).map((e: LooseType) => this.parser.rename_thrift("Message", e));
	}

	/**
	 * @description Get user information from mid.
	 */
	override async getContact(
		options: {
			mid: string;
		},
		useCache: boolean = this.useTalkCache,
	): Promise<LINETypes.Contact> {
		if (useCache && this.cache.getCache("getContact", options)) {
			return this.cache.getCache("getContact", options) as LINETypes.Contact;
		}
		const { mid } = { ...options };
		const response = await this.direct_request(
			[[11, 2, mid]],
			"getContact",
			this.TalkService_PROTOCOL_TYPE,
			"Contact",
			this.TalkService_API_PATH,
		);
		if (useCache) this.cache.setCache("getContact", options, response);
		return response;
	}

	/**
	 * @description Get users information from mids.
	 */
	public async getContacts(
		options: {
			mids: string[];
		},
		useCache: boolean = this.useTalkCache,
	): Promise<LINETypes.Contact[]> {
		const { mids } = { ...options };
		const response = (
			await this.direct_request(
				[[15, 2, [11, mids]]],
				"getContacts",
				this.TalkService_PROTOCOL_TYPE,
				false,
				this.TalkService_API_PATH,
			)
		).map((e: LooseType) =>
			this.parser.rename_thrift("Contact", e),
		) as LINETypes.Contact[];
		if (useCache) {
			response.forEach((e) => {
				this.cache.setCache("getContact", { mid: e.mid }, e);
			});
		}
		return response;
	}

	public async getContactsV2(
		options: {
			mids: string[];
		},
		useCache: boolean = this.useTalkCache,
	): Promise<LINETypes.GetContactsV2Response> {
		const { mids } = { ...options };
		if (
			useCache &&
			mids.length === 1 &&
			this.cache.getCache("getContactV2", { mid: mids[0] })
		) {
			const res: { contacts: Record<string, LooseType> } = { contacts: {} };
			res.contacts[mids[0]] = this.cache.getCache("getContactV2", {
				mid: mids[0],
			});
			return res;
		}
		const response = (await this.request(
			[[15, 1, [11, mids]]],
			"getContactsV2",
			this.TalkService_PROTOCOL_TYPE,
			"GetContactsV2Response",
			this.TalkService_API_PATH,
		)) as LINETypes.GetContactsV2Response;

		if (useCache) {
			for (const key in response.contacts) {
				if (Object.prototype.hasOwnProperty.call(response.contacts, key)) {
					const contact = response.contacts[key];
					this.cache.setCache(
						"getContact",
						{ mid: contact.contact.mid },
						contact.contact,
					);
					this.cache.setCache(
						"getContactV2",
						{ mid: contact.contact.mid },
						contact,
					);
				}
			}
		}
		return response;
	}

	/**
	 * @description Get chat information from gid.
	 */
	public async getChat(
		options: {
			gid: string;
			withMembers?: boolean;
			withInvitees?: boolean;
		},
		useCache: boolean = this.useTalkCache,
	): Promise<LINETypes.Chat> {
		if (useCache && this.cache.getCache("getChat", options)) {
			return this.cache.getCache("getChat", options) as LINETypes.Chat;
		}
		const { gid, withInvitees, withMembers } = {
			withInvitees: true,
			withMembers: true,
			...options,
		};
		const response = (await this.request(
			[
				[15, 1, [11, [gid]]],
				[2, 2, withMembers],
				[2, 3, withInvitees],
			],
			"getChats",
			this.TalkService_PROTOCOL_TYPE,
			"GetChatsResponse",
			this.TalkService_API_PATH,
		)) as LINETypes.GetChatsResponse;
		if (useCache) {
			response.chats.forEach((chat: LINETypes.Chat) => {
				this.cache.setCache("getChat", options, chat);
			});
		}
		return response.chats[0];
	}

	/**
	 * @description Get chats information from gids.
	 */
	override async getChats(
		options: {
			gids: string[];
			withMembers?: boolean;
			withInvitees?: boolean;
		},
		useCache: boolean = this.useTalkCache,
	): Promise<LINETypes.GetChatsResponse> {
		const { gids, withInvitees, withMembers } = {
			withInvitees: true,
			withMembers: true,
			...options,
		};
		const response = (await this.request(
			[
				[15, 1, [11, gids]],
				[2, 2, withMembers],
				[2, 3, withInvitees],
			],
			"getChats",
			this.TalkService_PROTOCOL_TYPE,
			"GetChatsResponse",
			this.TalkService_API_PATH,
		)) as LINETypes.GetChatsResponse;
		if (useCache) {
			response.chats.forEach((chat: LINETypes.Chat) => {
				this.cache.setCache(
					"getChat",
					{ gid: chat.chatMid, withMembers, withInvitees },
					chat,
				);
			});
		}
		return response;
	}

	/**
	 * @description Get information on all the chats joined.
	 */
	public getAllChatMids(
		options: {
			withMembers?: boolean;
			withInvitees?: boolean;
		} = {},
	): Promise<LINETypes.GetAllChatMidsResponse> {
		const { withInvitees, withMembers } = {
			withInvitees: true,
			withMembers: true,
			...options,
		};
		return this.direct_request(
			[
				[
					12,
					1,
					[
						[2, 1, withMembers],
						[2, 2, withInvitees],
					],
				],
				[8, 2, 7],
			],
			"getAllChatMids",
			this.TalkService_PROTOCOL_TYPE,
			"GetAllChatMidsResponse",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Get information on all friend.
	 */
	public getAllContactIds(): Promise<string[]> {
		return this.direct_request(
			[],
			"getAllContactIds",
			this.TalkService_PROTOCOL_TYPE,
			false,
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Kick out members of the chat.
	 */
	public deleteOtherFromChat(options: {
		to: string;
		mid: string;
	}): Promise<LINETypes.DeleteOtherFromChatResponse> {
		const { to, mid } = {
			...options,
		};
		return this.request(
			[
				[8, 1, this.getReqseq()],
				[11, 2, to],
				[14, 3, [11, [mid]]],
			],
			"deleteOtherFromChat",
			this.TalkService_PROTOCOL_TYPE,
			"DeleteOtherFromChatResponse",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Leave the chat.
	 */
	public deleteSelfFromChat(options: {
		to: string;
	}): Promise<LINETypes.DeleteSelfFromChatResponse> {
		const { to } = {
			...options,
		};
		return this.request(
			[
				[8, 1, this.getReqseq()],
				[11, 2, to],
			],
			"deleteSelfFromChat",
			this.TalkService_PROTOCOL_TYPE,
			"DeleteSelfFromChatResponse",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Invite mids into the chat.
	 */
	public inviteIntoChat(options: {
		to: string;
		mids: string[];
	}): Promise<LINETypes.InviteIntoChatResponse> {
		const { to, mids } = {
			...options,
		};
		return this.request(
			[
				[8, 1, this.getReqseq()],
				[11, 2, to],
				[14, 3, [11, mids]],
			],
			"inviteIntoChat",
			this.TalkService_PROTOCOL_TYPE,
			"InviteIntoChatResponse",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Accept the chat invitation and join.
	 */
	public acceptChatInvitation(options: {
		to: string;
	}): Promise<LINETypes.AcceptChatInvitationResponse> {
		const { to } = {
			...options,
		};
		return this.request(
			[
				[8, 1, this.getReqseq()],
				[11, 2, to],
			],
			"acceptChatInvitation",
			this.TalkService_PROTOCOL_TYPE,
			"AcceptChatInvitationResponse",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Issue a ticket to join the chat.
	 */
	public reissueChatTicket(options: {
		groupMid: string;
	}): Promise<LINETypes.ReissueChatTicketResponse> {
		const { groupMid } = {
			...options,
		};
		return this.request(
			[
				[8, 1, this.getReqseq()],
				[11, 2, groupMid],
			],
			"reissueChatTicket",
			this.TalkService_PROTOCOL_TYPE,
			"ReissueChatTicketResponse",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Find the chat from the ticket.
	 */
	public findChatByTicket(options: {
		ticketId: string;
	}): Promise<LINETypes.FindChatByTicketResponse> {
		const { ticketId } = {
			...options,
		};
		return this.request(
			[[11, 1, ticketId]],
			"findChatByTicket",
			this.TalkService_PROTOCOL_TYPE,
			"FindChatByTicketResponse",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Join the chat using the ticket.
	 */
	public acceptChatInvitationByTicket(options: {
		to: string;
		ticket: string;
	}): Promise<LINETypes.AcceptChatInvitationByTicketResponse> {
		const { to, ticket } = {
			...options,
		};
		return this.request(
			[
				[8, 1, this.getReqseq()],
				[11, 2, to],
				[11, 3, ticket],
			],
			"acceptChatInvitationByTicket",
			this.TalkService_PROTOCOL_TYPE,
			"AcceptChatInvitationByTicketResponse",
			this.TalkService_API_PATH,
		);
	}

	/**
	 * @description Update the information for the specified chat.
	 */
	public updateChat(options: {
		chatMid: string;
		chatSet: Partial<LINETypes.Chat>;
		updatedAttribute: LINETypes.ChatAttribute & number;
	}): Promise<LINETypes.UpdateChatResponse> {
		const { chatMid, chatSet, updatedAttribute } = {
			...options,
		};

		return this.request(
			[
				[8, 1, this.getReqseq()],
				[
					12,
					2,
					[
						chatSet.type ? [8, 1, chatSet.type] : [8, 1, 1],
						[11, 2, chatMid],
						chatSet.notificationDisabled
							? [2, 4, chatSet.notificationDisabled]
							: null,
						chatSet.chatName ? [11, 6, chatSet.chatName] : null,
						chatSet.picturePath ? [11, 7, chatSet.picturePath] : null,
						chatSet.extra?.groupExtra
							? [
									12,
									8,
									[
										[
											12,
											1,
											[
												[2, 2, chatSet.extra.groupExtra.preventedJoinByTicket],
												[2, 6, chatSet.extra.groupExtra.addFriendDisabled],
												[2, 7, chatSet.extra.groupExtra.ticketDisabled],
											],
										],
									],
								]
							: null,
					],
				],
				[8, 3, updatedAttribute],
			],
			"updateChat",
			this.TalkService_PROTOCOL_TYPE,
			"UpdateChatResponse",
			this.TalkService_API_PATH,
		);
	}

	public createChatRoomAnnouncement(options: {
		chatRoomMid: string;
		text: string;
		link?: string;
		thumbnail?: string;
		type?: number;
		displayFields?: number;
	}): Promise<LINETypes.ChatRoomAnnouncement> {
		const { chatRoomMid, text, link, thumbnail, type, displayFields } = {
			link: "",
			thumbnail: "",
			type: 0,
			displayFields: 5,
			...options,
		};
		return this.direct_request(
			[
				[8, 1, this.getReqseq()],
				[11, 2, chatRoomMid],
				[8, 3, type],
				[
					12,
					4,
					[
						[8, 1, displayFields],
						[11, 2, text],
						[11, 3, link],
						[11, 4, thumbnail],
					],
				],
			],
			"createChatRoomAnnouncement",
			this.TalkService_PROTOCOL_TYPE,
			"ChatRoomAnnouncement",
			this.TalkService_API_PATH,
		);
	}

	public async getLastE2EEPublicKeys(options: { chatMid: string }): Promise<
		Record<string, LINETypes.E2EEPublicKey>
	> {
		const { chatMid } = { ...options };
		const _res = await this.direct_request(
			[[11, 2, chatMid]],
			"getLastE2EEPublicKeys",
			this.TalkService_PROTOCOL_TYPE,
			false,
			this.TalkService_API_PATH,
		);
		const res: Record<string, LINETypes.E2EEPublicKey> = {};
		for (const key in _res) {
			if (Object.prototype.hasOwnProperty.call(_res, key)) {
				const val = _res[key];
				res[key] = this.parser.rename_thrift("E2EEPublicKey", val);
			}
		}
		return res;
	}

	public registerE2EEGroupKey(options: {
		keyVersion: number;
		chatMid: string;
		members: string[];
		keyIds: number[];
		encryptedSharedKeys: Buffer[];
	}): Promise<LINETypes.E2EEGroupSharedKey> {
		const { keyVersion, chatMid, members, keyIds, encryptedSharedKeys } = {
			...options,
		};
		return this.direct_request(
			[
				[8, 2, keyVersion],
				[11, 3, chatMid],
				[15, 4, [11, members]],
				[15, 5, [8, keyIds]],
				[15, 6, [11, encryptedSharedKeys]],
			],
			"registerE2EEGroupKey",
			this.TalkService_PROTOCOL_TYPE,
			"E2EEGroupSharedKey",
			this.TalkService_API_PATH,
		);
	}
}
