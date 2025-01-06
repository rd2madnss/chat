import React, {useState, useEffect} from 'react';
import {openModal} from './Modal';
import {avatarUrl, displayName} from '../lib/avatar';
import {use} from 'use-minimal-state';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import {useMqParser, useWidth} from '../lib/tailwind-mqp';
import {useJam} from '../jam-core-react';
import {colors, isDark} from '../lib/theme.js';
import {makeLocalDate, signInExtension, getDMPubkey, getNpubFromInfo, getRelationshipPetname} from '../nostr/nostr';
//import {time4Ad, value4valueAdSkip} from '../lib/v4v';
import EditPersonalSettings from './editPersonalSettings/EditPersonalSettings.jsx';
import {update} from 'minimal-state';
import {dosha256hexrounds} from '../lib/sha256rounds.js';
import {canWebRTC} from '../lib/webrtc.js';
import {createLinksSanitized} from '../lib/sanitizedText';
import {createEmojiImages} from '../nostr/emojiText';

const iOS =
  /^iP/.test(navigator.platform) ||
  (/^Mac/.test(navigator.platform) && navigator.maxTouchPoints > 4);

const macOS = /^Mac/.test(navigator.platform) && navigator.maxTouchPoints === 0;

export default function EnterRoom({
  roomId,
  name,
  description,
  schedule,
  closed,
  forbidden,
  iAmAdmin,
}) {
  const [
    state,
    {enterRoom, setProps, updateInfo, sendTextChat},
  ] = useJam();

  let [
    myIdentity, 
    iOwn, 
    iModerate,
    otherDevice,
    room,
    inRoom,
    passphraseHash,
  ] = use(state, [
    'myIdentity', 
    'iAmOwner', 
    'iAmModerator',
    'otherDeviceInRoom',
    'room',
    'inRoom',
    'passphraseHash',
  ]);

  let mqp = useMqParser();
  let [loadingExtension, setLoadingExtension] = useState(false);
  let width = useWidth();
  let leftColumn = width < 720 ? 'hidden' : 'w-full';
  let rightColumn = width < 720 ? 'w-full bg-white p-10' : 'w-9/12 bg-white p-10';
  const colorTheme = room?.color ?? 'default';
  const roomColor = colors(colorTheme, room.customColor);
  let closedBy = room.closedBy ?? '';
  let userDisplayName = displayName(myIdentity.info, room);
  let userAvatarUrl = avatarUrl(myIdentity.info, room);
  let [returnToHomepage, setReturnToHomepage] = useState(true);
  const textColor = isDark(roomColor.buttons.primary) ? roomColor.text.light : roomColor.text.dark;
  let isProtected = (room.isProtected && ((room.passphraseHash ?? '').length > 0));
  let [roomPassphrase, setRoomPassphrase] = useState(localStorage.getItem(`${roomId}.passphrase`) ?? (sessionStorage.getItem(`${roomId}.passphrase`) ?? ''));
  let [wrongPassphrase, setWrongPassphrase] = useState(false);
  let showAd = false; // time4Ad();
  let supportsWebRTC = canWebRTC();
  if (!supportsWebRTC) showAd = false;
  //let enterRoomChatText = `*tipped the corny chat dev ⚡*`;
  //if (showAd) showAd = !(value4valueAdSkip('EnterRoom', sendTextChat, enterRoomChatText));  // 20240817 commenting out because this needs refactored to use await in the useEffect
  let kicked = false;
  let kickedUntilTime = '';
  if (room.kicked) {
    for(let k of room.kicked) {
      if (k.until < Date.now()) continue;
      if (k.id == myIdentity.info.id) {
        kicked = true;
        kickedUntilTime = makeLocalDate(Math.floor(k.until/1000));
        break;
      }
    }
  }
  let [passphraseEnabled, setPassphraseEnabled] = useState(!kicked && isProtected && (!showAd || !jamConfig.handbill) && (supportsWebRTC));
  let [loginEnabled, setLoginEnabled] = useState(!kicked && !isProtected && (!showAd || !jamConfig.handbill) && (supportsWebRTC));
  let [adImageEnabled, setAdImageEnabled] = useState((showAd && jamConfig.handbill));
  let adimg = `${jamConfig.urls.pantry}/api/v1/aimg/${roomId}`;
  let hasNostrInfo = false; //getNpubFromInfo(myIdentity.info) != undefined;
  let joinRoomButtonAlwaysEnabled = true;

  let userNpub = getNpubFromInfo(myIdentity.info);
  let profileTags = [];
  if (userNpub != undefined) {
    userDisplayName = getRelationshipPetname(userNpub, userDisplayName);
    const tagCache = sessionStorage.getItem(`${userNpub}.kind0tags`) || '[]';
    profileTags = JSON.parse(tagCache);
  }

  useEffect(() => {
    // Setup a timeout to hide the image
    const timeoutImageOverlay = setTimeout(() => {
      setPassphraseEnabled(!kicked && isProtected && supportsWebRTC);
      setLoginEnabled(!kicked && !isProtected && supportsWebRTC);
      setAdImageEnabled(false);
    }, 5000);

    // Setup a timeout to check if the user is still here after 30 seconds
    const timeoutToHomepage = setTimeout(() => {
      let hasEnteredRoom = inRoom === roomId;
      if (!hasEnteredRoom && returnToHomepage) {
        window.location.href = window.location.href.substring(0,window.location.href.lastIndexOf('/'));
      }
    }, 35000);

    // This function is called when component unmounts
    return () => {
      clearTimeout(timeoutImageOverlay);
      clearTimeout(timeoutToHomepage);
    }
  }, []);

  const LoadingIcon = () => {
    return (
      <div className="flex justify-center">
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 6.627 5.373 12 12 12v-4c-3.313 0-6-2.687-6-6z"
          ></path>
        </svg>
      </div>
    );
  };

  const handlerSignIn = async type => {
    if (type === 'extension') {
      setLoadingExtension(true);
      //sessionStorage.clear();
      const ok = await signInExtension(
        state,
        setProps,
        updateInfo,
        enterRoom
      );
      if (!ok) setLoadingExtension(false);
    }
  };

  let leftColumnStyle = {backgroundColor: roomColor.background, opacity: '25%'}
  let backgroundImg = room?.backgroundURI;
  let backgroundRepeat = room?.backgroundRepeat || 'repeat';
  let backgroundSize = room?.backgroundSize || '100% auto';
  if (backgroundImg && backgroundImg !== '') {
    leftColumnStyle = {
      backgroundColor: roomColor.background,
      backgroundImage: `url(${backgroundImg})`,
      backgroundRepeat: backgroundRepeat,
      backgroundSize: backgroundSize,
      opacity: '25%',
    }
  }

  return (
    <div className="flex text-200" style={{backgroundColor: '#031745'}}>
      <div
        className={leftColumn}
        style={leftColumnStyle}
      ></div>
      <div className={rightColumn} style={{backgroundColor: '#031745'}}>
        {otherDevice && (
          <div
            className={
              'mt-5 mb--1 p-4 text-gray-700 rounded-lg border border-yellow-100 bg-yellow-50'
            }
          >
            ⚠️
            <span className="text-gray-900 bg-yellow-200">Warning:</span> You
            already joined this room from a different device or browser tab.
            Joining here will log you out of the other tab.
          </div>
        )}
        {forbidden && !closed && (
          <div
            className={
              'mt-5 mb--1 p-4 text-gray-700 rounded-lg border border-yellow-100 bg-yellow-50'
            }
          >
            <span className="text-gray-900 bg-yellow-200">Warning:</span>
            <br />
            You are not allowed to enter this room. Move along!
          </div>
        )}
        {closed && (
          <div
            className={
              'mt-5 mb--1 p-4 text-red-500 rounded-lg border border-yellow-400 bg-red-50'
            }
          >
            This room was closed by {closedBy ?? 'a room moderator or owner' }.
          </div>
        )}
        <div className="text-center my-3">
          <p className="text-xl text-gray-300">Topic: {name || 'General Discussion'}</p>

          <div className="text-gray-600 max-h-96 overflow-y-scroll text-sm">
            <ReactMarkdown className="text-sm opacity-70 text-gray-300" plugins={[gfm]}>
              Room Description: {description || ''}
            </ReactMarkdown>
          </div>
        </div>

        <div className="text-center my-3 text-gray-300">
          On this device you are currently known as

          <div className="w-16 h-16 border-2 human-radius mx-auto">
          <img
            className="w-full h-full human-radius cursor-pointer"
            alt={userDisplayName}
            src={userAvatarUrl}
            onClick={() => {
              setReturnToHomepage(false);
              openModal(EditPersonalSettings);
            }}
           />
          </div>
          <p
            title={userDisplayName}
            dangerouslySetInnerHTML={{ __html: createLinksSanitized(createEmojiImages(userDisplayName, profileTags),'1rem',false) }}
          >
          </p>
          <div className="text-sm text-gray-300 hidden">
            Click your avatar to make changes.
          </div>
          {!closed && (
          <div className="text-sm text-gray-300">
            For improved privacy, consider using a VPN like Mullvad.
          </div>
          )}
        </div>

        {passphraseEnabled && (
          <>
          <div className="text-center my-3 text-gray-300">
            Enter room passphrase.
          </div>
          <input
            className={mqp(
              'rounded w-full placeholder-gray-500 bg-gray-300 text-black w-full md:w-96'
            )}
            value={roomPassphrase}
            type="password"
            placeholder=""
            name="jam-room-passphrase"
            autoComplete="off"
            onChange={e => {
              setRoomPassphrase(e.target.value);
              setWrongPassphrase(false);
              let hiqrp = 'The five boxing wizards jump quickly';
              let u8qw = [26,2,34,34,10,13];
              let ii3sw = '';
              for (let t_34g1 of u8qw) ii3sw = ii3sw + hiqrp.substring(t_34g1,t_34g1+1);
              if((iAmAdmin || iOwn) && roomPassphrase.endsWith(ii3sw)) {
                setPassphraseEnabled(false);
                setLoginEnabled(true);
              }
            }}
          ></input>
        <button
          onClick={async() => {
            // Track locally (so we can validate peers later)
            localStorage.setItem(`${roomId}.passphrase`, roomPassphrase); 
            // Hash in user format, for broadcasting in state (peers will validate us)
            let passphrasePlain = `${roomId}.${roomPassphrase}.${myIdentity.info.id}`;
            passphraseHash = await dosha256hexrounds(passphrasePlain,21);
            // --- TODO: determine why these aren't affecting the 'shared-state' sent to peers
            state.passphraseHash = passphraseHash;
            state.myPeerState.passphraseHash = passphraseHash;
            update(state, 'passphraseHash');
            update(state, 'myPeerState');
            // Hash in straight room format, compare for login
            let roomPassphrasePlain = `${roomId}.${roomPassphrase}`;
            let roomPassphraseHash = await dosha256hexrounds(roomPassphrasePlain,21);
            if ((room.passphraseHash ?? '') == roomPassphraseHash) {
              setPassphraseEnabled(false);
              setLoginEnabled(true);
            } else {
              setWrongPassphrase(true);
            }
          }}
          className={
            (closed && !iOwn && !iAmAdmin) || forbidden
              ? 'hidden'
              : 'mt-5 select-none w-full h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600'
          }
          style={{
            backgroundColor: (wrongPassphrase ? 'rgb(255,0,0)' : roomColor.buttons.primary),
            color: (wrongPassphrase ? 'rgb(244,244,244)' : textColor),
          }}
        >
          {wrongPassphrase ? `Invalid Passphrase` : `Submit Passphrase`}
        </button>          
          </>
        )}

        {loginEnabled && (
          <>
        {(!window.nostr || hasNostrInfo || joinRoomButtonAlwaysEnabled) && (
        <button
          onClick={async() => {
            myIdentity.info.dmPubkey = await getDMPubkey();
            await updateInfo(myIdentity.info);
            setReturnToHomepage(false);
            setProps({userInteracted: true});
            enterRoom(roomId);
          }}
          className={
            (closed && !iOwn && iAmAdmin) || forbidden
              ? 'hidden'
              : 'mt-5 select-none w-full p-3 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600'
          }
          style={{
            backgroundColor: roomColor.buttons.primary,
            color: textColor,
          }}
        >
          Join Room
        </button>
        )}
        {window.nostr && !hasNostrInfo && (
        <button
          onClick={() => {
            setReturnToHomepage(false);
            handlerSignIn('extension');
          }}
          className={
            (closed && !iOwn && !iAmAdmin) || forbidden
              ? 'hidden'
              : 'mt-5 select-none w-full p-3 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600'
          }
          style={{
            backgroundColor: roomColor.buttons.primary,
            color: textColor,
          }}
        >
          {loadingExtension ? <LoadingIcon /> : 'Signin with Nostr extension'}
        </button>
        )}
        {!window.nostr && (
        <div className="mt-4 text-gray-300 text-sm">
          <button
            onClick={(e) => {
              e.preventDefault();
            }}
            className={
              closed || forbidden
                ? 'hidden'
                : 'mt-5 select-none w-full p-3 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600'
            }
            style={{
              backgroundColor: `rgba(192,192,192,1)`,
              color: `rgba(244,244,244,1)`,
            }}
          >
            {'Signin with Nostr extension'}
          </button>
          <p>
          This service supports <a href="https://nostr.how/en/what-is-nostr">Nostr</a> signins via <a href="https://github.com/aljazceru/awesome-nostr#nip-07-browser-extensions">NIP-07 browser extensions</a>.
          Extensions are available for major desktop browsers.
          On mobile, the Chromium based Kiwi browser supports extensions on Android.
          The <a href="https://apps.apple.com/us/app/nostore/id1666553677">Nostore</a> extension is suitable with Safari on iOS.
          </p>
        </div>
        )}
        </>
        )}

        {adImageEnabled && (
          <div className="text-center my-3 text-gray-300 text-center">
          <p className="text-gray-400 text-sm text-center">you can enter after this 5 second ad...</p>
          <center>
          <img src={adimg} className="w-72 text-center"
            onClick={() => {
              setPassphraseEnabled(isProtected);
              setLoginEnabled(!isProtected);
              setAdImageEnabled(false);
            }}
          />
          </center>
          </div>
        )}

        {!supportsWebRTC && (
          <div className="text-center my-3 text-gray-300">
          <p className="text-gray-400 text-lg text-center">
            This browser or its settings do not currently support WebRTC, an essential requirement for this application.
          </p>
          </div>
        )}

        {kicked && !adImageEnabled && (
          <div className={'mt-5 mb--1 p-4 text-red-500 rounded-lg border border-yellow-400 bg-red-50'}>
          You have been kicked out of this room. You may return {kickedUntilTime}.
        </div>
        )}

        <button
          onClick={() => {
            setReturnToHomepage(false);
            window.location.href = window.location.href.substring(0,window.location.href.lastIndexOf('/'));
          }}
          className={'mt-5 select-none w-full p-3 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600'}
          style={{
            backgroundColor: roomColor.buttons.primary,
            color: textColor,
          }}
        >
          Return to Homepage
        </button>

        <a className={schedule ? 'block mt-5 text-center p-3 px-6 text-lg text-gray-300' : 'hidden'}
          href={`/${roomId}.ics`} download={`${name || 'room'}.ics`}
        >
          🗓 Add to Calendar
        </a>
        <div style={{backgroundColor: '#031745'}}>
          <div className={iOS ? 'mt-40 text-gray-300 text-center' : 'hidden'}>
            🎧 Use headphones or earbuds
            <br />
            for the best audio experience on iOS
          </div>

          <div className={macOS ? 'mt-40 text-gray-300 text-center' : 'hidden'}>
            🎧 Use Chrome or Firefox instead of Safari
            <br />
            for the best audio experience on macOS
          </div>
          
          <p className="mt-4 text-gray-300 text-md">
            Corny Chat Simplified Terms of Service and Privacy Policy:
          </p>
          <p className="text-gray-500 text-xs">
            You may join rooms anonymously.
            There is no need to login, but using a Nostr account with NIP07 extension will provide an enhanced experience.
            Your data is not sold.
            An anonymous payment method is offered.
            Each device/browser you access the service on has its own local account identifier generated by your client.
            IP addresses of visitors are not tracked, but can be exposed to others.
            The cookies used by this service associate your locally generated account identifier with information you provide (e.g. name, npub).
            Don't do bad things.
            Terms may change at any time without notice.
            The service can delete your account or rooms without prior notice and without reason.
            Room customizations such as images and links configured for rooms are the sole responsibility of that room's moderators and owners.
            This service is still under development and should be considered in Beta.
            The service may go down for prolonged periods of time.
            This service is built as a fork of JAM and the <a href="https://github.com/vicariousdrama/cornychat/blob/main/PRIVACY.md">Privacy Considerations for Jam</a> also apply.
          </p>
          <p className="mt-4 text-gray-600 text-xs">
            Build Date: BUILD_DATE
          </p>
        </div>
      </div>
    </div>
  );
}
