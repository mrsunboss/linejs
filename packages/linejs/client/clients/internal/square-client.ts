// For Square (square, etc)

import type { NestedArray, ProtocolKey } from "../../libs/thrift/declares.ts";
import type * as LINETypes from "@evex/linejs-types";
import type { LooseType } from "../../entities/common.ts";
import { LiffClient } from "./liff-client.ts";

export class SquareClient extends LiffClient {
	public SquareService_API_PATH = "/SQ1";
	public SquareService_PROTOCOL_TYPE: ProtocolKey = 4;

	public SquareLiveTalkService_API_PATH = "/SQLV1";
	public SquareLiveTalkService_PROTOCOL_TYPE: ProtocolKey = 4;

	private async continueRequest<
		T extends (...args: LooseType) => LooseType,
	>(options: {
		response: Promise<ReturnType<T>> | ReturnType<T>;
		continuationToken: string;
		method: {
			handler: T;
			args: Parameters<T>;
		};
	}): Promise<ReturnType<T>> {
		function objectSum(base: LooseType, add: LooseType): LooseType {
			for (const key in add) {
				if (Object.prototype.hasOwnProperty.call(add, key)) {
					const value = (add as Record<string, LooseType>)[key];
					if (typeof value === "object") {
						if (!base[key]) {
							base[key] = value;
						} else {
							if (Array.isArray(value)) {
								base[key] = [...value, ...base[key]];
							} else {
								base[key] = objectSum(base[key], value);
							}
						}
					} else {
						base[key] = value;
					}
				}
			}
			return base;
		}
		const awaitedResponse = await options.response;

		if (!awaitedResponse.continuationToken) {
			return awaitedResponse;
		}
		const responseSum = { ...awaitedResponse };
		let continuationToken: string = awaitedResponse.continuationToken;
		while (true) {
			options.method.args[0].continuationToken = continuationToken;
			const _response = await options.method.handler.call(
				this,
				...options.method.args,
			);
			objectSum(responseSum, _response);
			if (!_response.continuationToken) {
				break;
			}
			continuationToken = _response.continuationToken;
		}
		return responseSum;
	}

	/**
	 * @description Get joined squares.
	 */
	public async getJoinedSquares(
		options: {
			limit?: number;
			continuationToken?: string;
			continueRequest?: boolean;
		} = {},
		useCache: boolean = false,
	): Promise<LINETypes.GetJoinedSquaresResponse> {
		const { limit, continuationToken, continueRequest } = {
			limit: 100,
			continueRequest: !options.limit && !options.continuationToken,
			...options,
		};
		const response = (await this.request(
			[
				[11, 2, continuationToken],
				[8, 3, limit],
			],
			"getJoinedSquares",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		)) as LINETypes.GetJoinedSquaresResponse;
		if (useCache) {
			response.squares.forEach((e) => {
				this.setSquareCache(
					{ squareMid: e.mid },
					{
						square: e,
						squareAuthority: response.authorities[e.mid],
						noteStatus: response.noteStatuses[e.mid],
						myMembership: response.members[e.mid],
						squareStatus: response.statuses[e.mid],
					},
				);
			});
		}
		if (continueRequest && response.continuationToken) {
			return this.continueRequest({
				response: response as LooseType,
				continuationToken: response.continuationToken,
				method: {
					handler: this.getJoinedSquares,
					args: [options],
				},
			});
		} else {
			return response;
		}
	}

	/**
	 * @description Invite to square chat.
	 */
	public inviteIntoSquareChat(options: {
		squareChatMid: string;
		targetMids: string[];
	}): Promise<LINETypes.InviteIntoSquareChatResponse> {
		const { squareChatMid, targetMids } = {
			...options,
		};
		return this.request(
			[
				[15, 1, [11, targetMids]],
				[11, 2, squareChatMid],
			],
			"inviteIntoSquareChat",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Invite to square.
	 */
	public inviteToSquare(options: {
		squareMid: string;
		squareChatMid: string;
		targetMids: string[];
	}): Promise<LINETypes.InviteToSquareResponse> {
		const { squareMid, squareChatMid, targetMids } = {
			...options,
		};
		return this.request(
			[
				[11, 2, squareMid],
				[15, 3, [11, targetMids]],
				[11, 4, squareChatMid],
			],
			"inviteToSquare",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Mark as read for square chat.
	 */
	public markAsReadInSquare(options: {
		squareChatMid: string;
		squareMessageId: string;
		squareThreadMid?: string;
	}): Promise<LINETypes.MarkAsReadResponse> {
		const { squareChatMid, squareMessageId, squareThreadMid } = {
			...options,
		};
		return this.request(
			[
				[11, 2, squareChatMid],
				[11, 4, squareMessageId],
				squareThreadMid && [11, 5, squareThreadMid],
			],
			"markAsRead",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description React to message for square chat message.
	 *
	 * @param reactionType
	 * ALL     = 0,
	 * UNDO    = 1,
	 * NICE    = 2,
	 * LOVE    = 3,
	 * FUN     = 4,
	 * AMAZING = 5,
	 * SAD     = 6,
	 * OMG     = 7,
	 */
	override reactToSquareMessage(options: {
		squareChatMid: string;
		reactionType?: LINETypes.MessageReactionType & number;
		squareMessageId: string;
		squareThreadMid?: string;
	}): Promise<LINETypes.ReactToMessageResponse> {
		const { squareChatMid, reactionType, squareMessageId, squareThreadMid } = {
			reactionType: 2,
			...options,
		};
		return this.request(
			[
				[8, 1, this.getReqseq("sq")],
				[11, 2, squareChatMid],
				[11, 3, squareMessageId],
				[8, 4, reactionType],
				squareThreadMid && [11, 5, squareThreadMid],
			],
			"reactToMessage",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Find square by invitation ticket.
	 */
	public findSquareByInvitationTicket(options: {
		invitationTicket: string;
	}): Promise<LINETypes.FindSquareByInvitationTicketResponse> {
		const { invitationTicket } = { ...options };
		return this.request(
			[[11, 2, invitationTicket]],
			"findSquareByInvitationTicket",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Find square by invitation ticket v2.
	 */
	public findSquareByInvitationTicketV2(options: {
		invitationTicket: string;
	}): Promise<LINETypes.FindSquareByInvitationTicketResponse> {
		const { invitationTicket } = { ...options };
		return this.request(
			[[11, 1, invitationTicket]],
			"findSquareByInvitationTicketV2",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Find square by Emid.
	 */
	public findSquareByEmid(options: {
		emid: string;
	}): Promise<LooseType> {
		// ...???
		const { emid } = { ...options };
		return this.request(
			[[11, 1, emid]],
			"findSquareByEmid",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Fetch square events.
	 */
	public override fetchMyEvents(
		options: {
			limit?: number;
			syncToken?: string;
			continuationToken?: string;
			subscriptionId?: number;
		} = {},
	): Promise<LINETypes.FetchMyEventsResponse> {
		const { limit, syncToken, continuationToken, subscriptionId } = {
			limit: 100,
			...options,
		};
		return this.request(
			[
				[10, 1, subscriptionId],
				[11, 2, syncToken],
				[8, 3, limit],
				[11, 4, continuationToken],
			],
			"fetchMyEvents",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Fetch square chat events.
	 */
	public fetchSquareChatEvents(options: {
		squareChatMid: string;
		limit?: number;
		syncToken?: string;
		continuationToken?: string;
		subscriptionId?: number;
		squareThreadMid?: string;
	}): Promise<LINETypes.FetchSquareChatEventsResponse> {
		const {
			squareChatMid,
			limit,
			syncToken,
			continuationToken,
			subscriptionId,
			squareThreadMid,
		} = { limit: 100, ...options };
		return this.request(
			[
				[10, 1, subscriptionId],
				[11, 2, squareChatMid],
				[11, 3, syncToken],
				[8, 4, limit],
				[8, 5, 1],
				[8, 6, 1],
				[11, 7, continuationToken],
				[8, 8, 1],
				[11, 9, squareThreadMid],
			],
			"fetchSquareChatEvents",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Send message for square chat.
	 */
	override async sendSquareMessage(
		options: {
			squareChatMid: string;
			text?: string;
			contentType?: LINETypes.ContentType & number;
			contentMetadata?: Record<string, string>;
			relatedMessageId?: string;
		},
		safe: boolean = true,
	): Promise<LINETypes.SendMessageResponse> {
		const {
			squareChatMid,
			text,
			contentType,
			contentMetadata,
			relatedMessageId,
		} = { contentType: 0, contentMetadata: {}, ...options };

		const message = [
			[11, 2, squareChatMid],
			[11, 10, text],
			[8, 15, contentType],
			[13, 18, [11, 11, contentMetadata]],
		];
		if (relatedMessageId) {
			message.push([11, 21, relatedMessageId], [8, 22, 3], [8, 24, 2]);
		}

		const { promise, resolve } =
			Promise.withResolvers<LINETypes.SendMessageResponse>();

		const request = async () => {
			resolve(
				await this.request(
					[
						[8, 1, this.getReqseq("sq")],
						[11, 2, squareChatMid],
						[
							12,
							3,
							[
								[12, 1, message],
								[8, 3, 4],
							],
						],
					],
					"sendMessage",
					this.SquareService_PROTOCOL_TYPE,
					true,
					this.SquareService_API_PATH,
				),
			);
		};

		if (safe) {
			this.squareRateLimitter.appendCall(request);
		} else {
			await request();
		}

		return promise;
	}

	/**
	 * @description Get square info.
	 */
	public async getSquare(
		options: {
			squareMid: string;
		},
		useCache: boolean = false,
	): Promise<LINETypes.GetSquareResponse> {
		if (useCache && this.cache.getCache("getSquare", options)) {
			return this.cache.getCache(
				"getSquare",
				options,
			) as LINETypes.GetSquareResponse;
		}
		const { squareMid } = { ...options };
		const response = (await this.request(
			[[11, 2, squareMid]],
			"getSquare",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		)) as LINETypes.GetSquareResponse;
		if (useCache) this.setSquareCache(options, response);
		return response;
	}

	/**
	 * @description Set square info to cache.
	 */
	protected setSquareCache(
		options: {
			squareMid: string;
		},
		response: LINETypes.GetSquareResponse,
	) {
		this.cache.setCache("getSquare", options, response);
	}

	/**
	 * @description Get my member ship (profile) of square.
	 */
	override async getSquareProfile(options: {
		squareMid: string;
	}): Promise<LINETypes.SquareMember> {
		return (await this.getSquare(options)).myMembership;
	}

	/**
	 * @description Get square chat info.
	 */
	override async getSquareChat(
		options: {
			squareChatMid: string;
		},
		useCache: boolean = false,
	): Promise<LINETypes.GetSquareChatResponse> {
		if (useCache && this.cache.getCache("getSquareChat", options)) {
			return this.cache.getCache(
				"getSquareChat",
				options,
			) as LINETypes.GetSquareChatResponse;
		}
		const { squareChatMid } = { ...options };
		const response = (await this.request(
			[[11, 1, squareChatMid]],
			"getSquareChat",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		)) as LINETypes.GetSquareChatResponse;
		if (useCache) this.cache.setCache("getSquareChat", options, response);
		return response;
	}

	/**
	 * @description Get joinable square chats.
	 */
	public getJoinableSquareChats(options: {
		squareMid: string;
		limit?: number;
		continuationToken?: string;
	}): Promise<LINETypes.GetJoinableSquareChatsResponse> {
		const { squareMid, limit, continuationToken } = { limit: 100, ...options };
		return this.request(
			[
				[11, 1, squareMid],
				[11, 10, continuationToken],
				[8, 11, limit],
			],
			"getJoinableSquareChats",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	private defaultSquareCoverImageObsHash =
		"0h6tJfahRYaVt3H0eLAsAWDFheczgHd3wTCTx2eApNKSoefHNVGRdwfgxbdgUMLi8MSngnPFMeNmpbLi8MSngnPFMeNmpbLi8MSngnPQ";

	/**
	 *  @description Create square.
	 * @param SquareJoinMethodType
	 * NONE(0),
	 * APPROVAL(1),
	 * CODE(2);
	 */
	public createSquare(options: {
		squareName: string;
		displayName: string;
		profileImageObsHash?: string;
		description?: string;
		searchable?: boolean;
		SquareJoinMethodType?: LINETypes.SquareJoinMethodType & number;
	}): Promise<LINETypes.CreateSquareResponse> {
		const {
			squareName,
			displayName,
			profileImageObsHash,
			description,
			searchable,
			SquareJoinMethodType,
		} = {
			profileImageObsHash: this.defaultSquareCoverImageObsHash,
			description: "",
			searchable: true,
			SquareJoinMethodType: 0,
			...options,
		};
		return this.request(
			[
				[8, 2, this.getReqseq("sq")],
				[
					12,
					2,
					[
						[11, 2, squareName],
						[11, 4, profileImageObsHash],
						[11, 5, description],
						[2, 6, searchable],
						[8, 7, 1], // type
						[8, 8, 1], // categoryId
						[10, 10, 0], // revision
						[2, 11, true], // ableToUseInvitationTicket
						[12, 14, [[8, 1, SquareJoinMethodType]]],
						[2, 15, false], // adultOnly
						[15, 16, [11, []]], // svcTags
					],
				],
				[
					12,
					3,
					[
						[11, 3, displayName],
						// [11, 4, profileImageObsHash],
						[2, 5, true], // ableToReceiveMessage
						[10, 9, 0], // revision
					],
				],
			],
			"createSquare",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Get square chat announcements.
	 */
	public getSquareChatAnnouncements(options: {
		squareChatMid: string;
	}): Promise<LINETypes.GetSquareChatAnnouncementsResponse> {
		const { squareChatMid } = { ...options };
		return this.request(
			[[11, 2, squareChatMid]],
			"getSquareChatAnnouncements",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Update square feature set.
	 * @param updateAttributes
	 * CREATING_SECRET_SQUARE_CHAT(1),
	 * INVITING_INTO_OPEN_SQUARE_CHAT(2),
	 * CREATING_SQUARE_CHAT(3),
	 * READONLY_DEFAULT_CHAT(4),
	 * SHOWING_ADVERTISEMENT(5),
	 * DELEGATE_JOIN_TO_PLUG(6),
	 * DELEGATE_KICK_OUT_TO_PLUG(7),
	 * DISABLE_UPDATE_JOIN_METHOD(8),
	 * DISABLE_TRANSFER_ADMIN(9),
	 * CREATING_LIVE_TALK(10);
	 */
	public updateSquareFeatureSet(options: {
		squareMid: string;
		updateAttributes: (LINETypes.SquareFeatureSetAttribute & number)[];
		revision?: number;
		creatingSecretSquareChat?: LINETypes.BooleanState & number;
	}): Promise<LINETypes.UpdateSquareFeatureSetResponse> {
		const { squareMid, updateAttributes, revision, creatingSecretSquareChat } =
			{ revision: 0, creatingSecretSquareChat: 0, ...options };
		const SquareFeatureSet: NestedArray = [
			[11, 1, squareMid],
			[10, 2, revision],
		];
		if (creatingSecretSquareChat) {
			SquareFeatureSet.push([
				12,
				11,
				[
					[8, 1, 1],
					[8, 2, creatingSecretSquareChat],
				],
			]);
		}
		return this.request(
			[
				[14, 2, [8, updateAttributes]],
				[12, 3, SquareFeatureSet],
			],
			"updateSquareFeatureSet",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Join square.
	 */
	public joinSquare(options: {
		squareMid: string;
		displayName: string;
		ableToReceiveMessage?: boolean;
		passCode?: string | undefined;
	}): Promise<LINETypes.JoinSquareResponse> {
		const { squareMid, displayName, ableToReceiveMessage, passCode } = {
			ableToReceiveMessage: false,
			...options,
		};
		return this.request(
			[
				[11, 2, squareMid],
				[
					12,
					3,
					[
						[11, 2, squareMid],
						[11, 3, displayName],
						[2, 5, ableToReceiveMessage],
						[10, 9, 0],
					],
				],
				[12, 5, [[12, 2, [[11, 1, passCode]]]]],
			],
			"joinSquare",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Remove square subscriptions.
	 */
	public removeSubscriptions(options: {
		subscriptionIds: number[];
	}): Promise<LINETypes.RemoveSubscriptionsResponse> {
		const { subscriptionIds } = { ...options };
		return this.request(
			[[15, 2, [10, subscriptionIds]]],
			"removeSubscriptions",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Unsend square chat message.
	 */
	public unsendSquareMessage(options: {
		squareChatMid: string;
		squareMessageId: string;
	}): Promise<LINETypes.UnsendMessageResponse> {
		const { squareChatMid, squareMessageId } = { ...options };
		return this.request(
			[
				[11, 2, squareChatMid],
				[11, 3, squareMessageId],
			],
			"unsendMessage",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Create square chat.
	 */
	public createSquareChat(options: {
		squareChatMid: string;
		squareName: string;
		chatImageObsHash?: string;
		squareChatType?: LINETypes.SquareChatType & number;
		maxMemberCount?: number;
		ableToSearchMessage?: LINETypes.BooleanState & number;
		squareMemberMids?: string[];
	}): Promise<LINETypes.CreateSquareChatResponse> {
		const {
			squareChatMid,
			squareName,
			chatImageObsHash,
			squareChatType,
			maxMemberCount,
			ableToSearchMessage,
			squareMemberMids,
		} = {
			chatImageObsHash: this.defaultSquareCoverImageObsHash,
			squareChatType: 1,
			maxMemberCount: 5000,
			ableToSearchMessage: 1,
			squareMemberMids: [],
			...options,
		};
		return this.request(
			[
				[8, 1, this.getReqseq("sq")],
				[
					12,
					2,
					[
						[11, 1, squareChatMid],
						[8, 3, squareChatType],
						[11, 4, squareName],
						[11, 5, chatImageObsHash],
						[8, 7, maxMemberCount],
						[8, 11, ableToSearchMessage],
					],
				],
				[15, 3, [11, squareMemberMids]],
			],
			"createSquareChat",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Delete square chat.
	 */
	public deleteSquareChat(options: {
		squareChatMid: string;
		revision?: number;
	}): Promise<LINETypes.DeleteSquareChatResponse> {
		const { squareChatMid, revision } = { revision: 0, ...options };
		return this.request(
			[
				[11, 2, squareChatMid],
				[10, 3, revision],
			],
			"deleteSquareChat",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Get square chat members.
	 */
	public async getSquareChatMembers(
		options: {
			squareChatMid: string;
			limit?: number;
			continuationToken?: string;
			continueRequest?: boolean;
		},
		useCache: boolean = false,
	): Promise<LINETypes.GetSquareChatMembersResponse> {
		const { squareChatMid, limit, continuationToken, continueRequest } = {
			limit: 100,
			continueRequest: !options.limit && !options.continuationToken,
			...options,
		};
		const req = [
			[11, 1, squareChatMid],
			[8, 3, limit],
		];
		if (continuationToken) {
			req.push([11, 2, continuationToken]);
		}
		const response = (await this.request(
			req,
			"getSquareChatMembers",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		)) as LINETypes.GetSquareChatMembersResponse;
		if (useCache) {
			response.squareChatMembers.forEach((e) => {
				if (
					!(
						this.cache.getCache("getSquareMember", {
							squareMemberMid: e.squareMemberMid,
						}) as LINETypes.GetSquareMemberResponse
					)?.oneOnOneChatMid
				) {
					this.cache.setCache(
						"getSquareMember",
						{ squareMemberMid: e.squareMemberMid },
						{ squareMember: e },
					);
				}
			});
		}

		if (continueRequest && response.continuationToken) {
			return this.continueRequest({
				response: response as LooseType,
				continuationToken: response.continuationToken,
				method: {
					handler: this.getSquareChatMembers,
					args: [options],
				},
			});
		} else {
			return response;
		}
	}

	/**
	 * @description Get square feature set.
	 */
	public getSquareFeatureSet(options: {
		squareMid: string;
	}): Promise<LINETypes.GetSquareFeatureSetResponse> {
		const { squareMid } = { ...options };
		return this.request(
			[[11, 2, squareMid]],
			"getSquareFeatureSet",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Get square invitation ticket Url.
	 */
	public getSquareInvitationTicketUrl(options: {
		mid: string;
	}): Promise<LINETypes.GetInvitationTicketUrlResponse> {
		const { mid } = { ...options };
		return this.request(
			[[11, 2, mid]],
			"getInvitationTicketUrl",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Update square chat member.
	 */
	public updateSquareChatMember(options: {
		squareMemberMid: string;
		squareChatMid: string;
		updatedAttrs?: (LINETypes.SquareChatMemberAttribute & number)[];
		notificationForMessage?: boolean;
		notificationForNewMember?: boolean;
	}): Promise<LINETypes.UpdateSquareChatMemberResponse> {
		const {
			squareMemberMid,
			squareChatMid,
			updatedAttrs,
			notificationForMessage,
			notificationForNewMember,
		} = {
			updatedAttrs: [6],
			notificationForMessage: true,
			notificationForNewMember: true,
			...options,
		};
		return this.request(
			[
				[14, 2, [8, updatedAttrs]],
				[
					12,
					3,
					[
						[11, 1, squareMemberMid],
						[11, 2, squareChatMid],
						[2, 5, notificationForMessage],
						[2, 6, notificationForNewMember],
					],
				],
			],
			"updateSquareChatMember",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Update square member.
	 */
	public updateSquareMember(options: {
		squareMemberMid: string;
		squareMid: string;
		displayName?: string;
		membershipState?: LINETypes.SquareMembershipState & number;
		role?: LINETypes.SquareMemberRole & number;
		updatedAttrs?: (LINETypes.SquareMemberAttribute & number)[];
		updatedPreferenceAttrs?: number[];
		revision?: number;
	}): Promise<LINETypes.UpdateSquareMemberResponse> {
		const {
			squareMemberMid,
			squareMid,
			displayName,
			membershipState,
			role,
			updatedAttrs,
			updatedPreferenceAttrs,
			revision,
		} = {
			updatedAttrs: [],
			updatedPreferenceAttrs: [],
			revision: 0,
			...options,
		};
		const squareMember: NestedArray = [
			[11, 1, squareMemberMid],
			[11, 2, squareMid],
		];
		if (updatedAttrs.includes(1)) {
			squareMember.push([11, 3, displayName]);
		}
		if (updatedAttrs.includes(5)) {
			squareMember.push([8, 7, membershipState]);
		}
		if (updatedAttrs.includes(6)) {
			squareMember.push([8, 8, role]);
		}
		squareMember.push([10, 9, revision]);
		return this.request(
			[
				[14, 2, [8, updatedAttrs]],
				[14, 3, [8, updatedPreferenceAttrs]],
				[12, 4, squareMember],
			],
			"updateSquareMember",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Kick out square member.
	 */
	public async kickOutSquareMember(options: {
		squareMid: string;
		squareMemberMid: string;
		allowRejoin?: boolean;
	}): Promise<LINETypes.UpdateSquareMemberResponse> {
		const { squareMid, squareMemberMid, allowRejoin } = {
			allowRejoin: true,
			...options,
		};
		const UPDATE_PREF_ATTRS: number[] = [];
		const UPDATE_ATTRS = [5];
		const MEMBERSHIP_STATE = allowRejoin ? 5 : 6;
		const getSquareMemberResp = await this.getSquareMember({ squareMemberMid });
		const squareMember = getSquareMemberResp.squareMember;
		const squareMemberRevision = squareMember.revision;
		return this.updateSquareMember({
			squareMemberMid,
			squareMid,
			membershipState: MEMBERSHIP_STATE,
			updatedAttrs: UPDATE_ATTRS,
			updatedPreferenceAttrs: UPDATE_PREF_ATTRS,
			revision: squareMemberRevision as number,
		});
	}

	/**
	 * @description Check square join code.
	 */
	public checkSquareJoinCode(options: {
		squareMid: string;
		code: string;
	}): Promise<LooseType> {
		const { squareMid, code } = { ...options };
		return this.request(
			[
				[11, 2, squareMid],
				[11, 3, code],
			],
			"checkJoinCode",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Create square chat announcement.
	 */
	public createSquareChatAnnouncement(options: {
		squareChatMid: string;
		squareMessageId: string;
		text: string;
		senderSquareMemberMid: string;
		createdAt: number;
		announcementType?: LINETypes.SquareChatAnnouncementType & number;
	}): Promise<LINETypes.CreateSquareChatAnnouncementResponse> {
		const {
			squareChatMid,
			squareMessageId,
			text,
			senderSquareMemberMid,
			createdAt,
			announcementType,
		} = { announcementType: 0, ...options };
		return this.request(
			[
				[8, 1, 0],
				[11, 2, squareChatMid],
				[
					12,
					3,
					[
						[8, 2, announcementType],
						[
							12,
							3,
							[
								[
									12,
									1,
									[
										[11, 1, squareMessageId],
										[11, 2, text],
										[11, 3, senderSquareMemberMid],
										[10, 4, createdAt],
									],
								],
							],
						],
					],
				],
			],
			"createSquareChatAnnouncement",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Get square member.
	 */
	override async getSquareMember(
		options: {
			squareMemberMid: string;
		},
		useCache: boolean = false,
	): Promise<LINETypes.GetSquareMemberResponse> {
		if (useCache && this.cache.getCache("getSquareMember", options)) {
			return this.cache.getCache(
				"getSquareMember",
				options,
			) as LINETypes.GetSquareMemberResponse;
		}
		const { squareMemberMid } = { ...options };
		const response = (await this.request(
			[[11, 2, squareMemberMid]],
			"getSquareMember",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		)) as LINETypes.GetSquareMemberResponse;
		if (useCache) this.cache.setCache("getSquareMember", options, response);
		return response;
	}

	/**
	 * @description Search square chat members.
	 */
	public searchSquareChatMembers(options: {
		squareChatMid: string;
		displayName: string;
		continuationToken?: string;
		limit?: number;
	}): Promise<LooseType> {
		const { squareChatMid, displayName, continuationToken, limit } = {
			limit: 200,
			...options,
		};
		return this.request(
			[
				[11, 1, squareChatMid],
				[12, 2, [[11, 1, displayName]]],
				[8, 4, limit],
				[11, 3, continuationToken],
			],
			"searchSquareChatMembers",
			this.SquareService_PROTOCOL_TYPE,
			false,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Get square emid.
	 */
	public getSquareEmid(options: {
		squareMid: string;
	}): Promise<LINETypes.GetSquareEmidResponse> {
		const { squareMid } = { ...options };
		return this.request(
			[[11, 1, squareMid]],
			"getSquareEmid",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Get square members by square.
	 */
	public async getSquareMembersBySquare(
		options: {
			squareMid: string;
			squareMemberMids?: string[];
		},
		useCache: boolean = false,
	): Promise<LINETypes.GetSquareMembersBySquareResponse> {
		const { squareMid, squareMemberMids } = {
			squareMemberMids: [],
			...options,
		};
		const response = (await this.request(
			[
				[11, 2, squareMid],
				[14, 3, [11, squareMemberMids]],
			],
			"getSquareMembersBySquare",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		)) as LINETypes.GetSquareMembersBySquareResponse;
		if (useCache) {
			response.members.forEach((e) => {
				if (
					!(
						this.cache.getCache("getSquareMember", {
							squareMemberMid: e.squareMemberMid,
						}) as LINETypes.GetSquareMemberResponse
					)?.oneOnOneChatMid
				) {
					this.cache.setCache(
						"getSquareMember",
						{ squareMemberMid: e.squareMemberMid },
						{ squareMember: e },
					);
				}
			});
		}
		return response;
	}

	/**
	 * @description Manual square repair.
	 */
	public manualRepair(options: {
		limit?: number;
		syncToken?: string;
		continuationToken?: string;
	}): Promise<LINETypes.ManualRepairResponse> {
		const { limit, syncToken, continuationToken } = { limit: 100, ...options };
		return this.request(
			[
				[11, 1, syncToken],
				[8, 2, limit],
				[11, 3, continuationToken],
			],
			"manualRepair",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Leave square.
	 */
	public leaveSquare(options: {
		squareMid: string;
	}): Promise<LINETypes.LeaveSquareResponse> {
		const { squareMid } = { ...options };
		return this.request(
			[[11, 2, squareMid]],
			"leaveSquare",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Report square.
	 */
	public reportSquare(options: {
		squareMid: string;
		reportType: LINETypes.ReportType & number;
		otherReason?: string;
	}): Promise<LINETypes.ReportSquareResponse> {
		const { squareMid, reportType, otherReason } = { ...options };
		return this.request(
			[
				[11, 2, squareMid],
				[10, 3, reportType],
				[11, 4, otherReason],
			],
			"reportSquare",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Report square message.
	 */
	public reportSquareMessage(options: {
		squareMid: string;
		squareChatMid: string;
		squareMessageId: string;
		reportType: LINETypes.ReportType & number;
		otherReason?: string;
		threadMid?: string;
	}): Promise<LINETypes.ReportSquareMessageResponse> {
		const {
			squareMid,
			squareChatMid,
			squareMessageId,
			reportType,
			otherReason,
			threadMid,
		} = { ...options };
		return this.request(
			[
				[11, 2, squareMid],
				[11, 3, squareChatMid],
				[11, 4, squareMessageId],
				[8, 5, reportType],
				otherReason && [11, 6, otherReason],
				threadMid && [11, 7, threadMid],
			],
			"reportSquareMessage",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Report square member.
	 */
	public reportSquareMember(options: {
		squareMemberMid: string;
		reportType: LINETypes.ReportType & number;
		otherReason?: string;
		squareChatMid?: string;
		threadMid?: string;
	}): Promise<LINETypes.ReportSquareMemberResponse> {
		const {
			squareMemberMid,
			reportType,
			otherReason,
			squareChatMid,
			threadMid,
		} = { ...options };
		return this.request(
			[
				[11, 2, squareMemberMid],
				[8, 3, reportType],
				otherReason && [11, 4, otherReason],
				squareChatMid && [11, 5, squareChatMid],
				threadMid && [11, 6, threadMid],
			],
			"reportSquareMessage",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Delete square message.
	 */
	public destroySquareMessage(options: {
		squareChatMid?: string;
		messageId?: string;
	}): Promise<LINETypes.DestroyMessageResponse> {
		const { squareChatMid, messageId } = { ...options };
		return this.request(
			[
				[11, 2, squareChatMid],
				[11, 4, messageId],
			],
			"destroyMessage",
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description Send square thrift request.
	 */
	public sendSquareRequest(
		methodName: string,
		params: NestedArray,
	): Promise<LooseType> {
		return this.request(
			params,
			methodName,
			this.SquareService_PROTOCOL_TYPE,
			true,
			this.SquareService_API_PATH,
		);
	}

	/**
	 * @description get fetchMyEvents current syncToken.
	 */
	public async getFetchMyEventsCurrentSyncToken(): Promise<string> {
		return (await this.manualRepair({ limit: 1 })).continuationToken;
	}

	/**
	 * @experimental
	 * @description Fetch square thread events.
	 */
	public fetchSquareThreadEvents(options: {
		squareChatMid: string;
		squareThreadMid: string;
		limit?: number;
		syncToken?: string;
		continuationToken?: string;
		subscriptionId?: number;
	}): Promise<LINETypes.FetchSquareChatEventsResponse> {
		return this.fetchSquareChatEvents(options);
	}

	/**
	 * @experimental
	 * @description Send message to square thread.
	 */
	public sendSquareThreadMessage(options: {
		squareThreadMid: string;
		squareChatMid: string;
		text?: string;
		contentType?: LINETypes.ContentType & number;
		contentMetadata?: LooseType;
		relatedMessageId?: string;
	}): Promise<LINETypes.SendMessageResponse> {
		const {
			squareThreadMid,
			squareChatMid,
			text,
			contentType,
			contentMetadata,
			relatedMessageId,
		} = { contentType: 0, contentMetadata: {}, ...options };
		const msg = [
			[11, 2, squareThreadMid],
			[11, 10, text],
			[8, 15, contentType],
			[13, 18, [11, 11, contentMetadata]],
		];
		if (relatedMessageId) {
			msg.push([11, 21, relatedMessageId], [8, 22, 3], [8, 24, 2]);
		}

		return this.request(
			[
				[8, 1, this.getReqseq("sq")],
				[11, 2, squareChatMid],
				[11, 3, squareThreadMid],
				[
					12,
					4,
					[
						[12, 1, msg],
						[8, 3, 5],
					],
				],
			],
			"sendSquareThreadMessage",
			this.SquareService_PROTOCOL_TYPE,
			"SendMessageResponse",
			this.SquareService_API_PATH,
		);
	}
}
