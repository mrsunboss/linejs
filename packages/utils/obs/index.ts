/**
 * @module
 * Utility for LINE OBS
 */

import type { ALL_STRING, WEB_SCHEME_PREFIX } from "../common/types.ts";

type LINE_OBS_PREFIX =
	| "obs://"
	| WEB_SCHEME_PREFIX<"obs.line-scdn.net/">
	| WEB_SCHEME_PREFIX<"obs-jp.line-apps.com/">
	| WEB_SCHEME_PREFIX<"obs.line-apps.com/">
	| ALL_STRING;

/**
 * @description LINE Obs Utility
 * @param prefix {LINE_OBS_PREFIX} obs prefix (e.x. 'https://obs.line-apps.com/')
 */
class LINE_OBS_BASE {
	constructor(
		public prefix: LINE_OBS_PREFIX = "https://obs.line-apps.com/",
	) {}

	/**
	 * Gets a OBS URI by appending the given hash to the prefix.
	 *
	 * @param {string} hash - The hash to append.
	 * @return {string} The getted URI.
	 */
	public getURI(hash: string): string {
		return this.prefix + hash;
	}

	/**
	 * Gets a profile image URI by appending the given member ID to the prefix.
	 *
	 * @param {string} memberId - The member ID (mid) to append.
	 * @return {string} The getted profile image URI.
	 */
	public getProfileImage(memberId: string): string {
		return this.prefix + "os/p/" + memberId;
	}

	/**
	 * Gets a group image URI by appending the given group ID to the prefix.
	 *
	 * @param {string} groupId - The group ID (gid) to use in the URL.
	 * @return {string} The getted line-obs group-image URL.
	 */
	public getGroupImage(groupId: string): string {
		return this.prefix + "os/g/" + groupId;
	}

	/**
	 * Gets an open chat member image URI by appending the given open chat member ID to the prefix.
	 *
	 * @param {string} squareMemberId - The square member ID (pid) to use in the URL.
	 * @param {boolean} isPreview - Whether to append '/preview' to the URL. (default: false)
	 * @return {string} The getted open chat member image URI.
	 */
	public getSquareMemberImage(squareMemberId: string, isPreview = false): string {
		return this.prefix + "r/g2/member/" + squareMemberId + (isPreview ? "/preview" : "");
	}	
}

export { LINE_OBS_BASE as LINE_OBS };