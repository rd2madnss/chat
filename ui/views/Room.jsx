import React, {useState, useMemo} from 'react';
import {use} from 'use-minimal-state';
import EnterRoom from './EnterRoom';
import RoomHeader from './RoomHeader';
import useWakeLock from '../lib/use-wake-lock';
import Navigation from './Navigation';
import {userAgent} from '../lib/user-agent';
import {colors, isDark} from '../lib/theme.js';
import {usePushToTalk, useCtrlCombos} from '../lib/hotkeys';
import {useJam} from '../jam-core-react';
import RoomSlides from './RoomSlides';
import RoomMembers from './RoomMembers';
import MiniRoomMembers from './MiniRoomMembers.jsx';
import RoomChat from './RoomChat';
import {useJamState} from '../jam-core-react/JamContext';
import {get} from '../jam-core/backend';

const inWebView =
  userAgent.browser?.name !== 'JamWebView' &&
  (userAgent.browser?.name === 'Chrome WebView' ||
    (userAgent.os?.name === 'iOS' &&
      userAgent.browser?.name !== 'Mobile Safari'));

export default function Room({room, roomId, uxConfig}) {
  // room = {name, description, moderators: [peerId], speakers: [peerId], access}
  const [state, {sendTextChat}] = useJam();
  useWakeLock();
  usePushToTalk();
  useCtrlCombos();

  let [isRecording, isPodcasting] = useJamState([
    'isSomeoneRecording',
    'isSomeonePodcasting',
  ]);
  isRecording = isRecording || isPodcasting;

  let [
    reactions,
    identities,
    speaking,
    iSpeak,
    iOwn,
    iModerate,
    iMayEnter,
    myIdentity,
    inRoom,
    peers,
    peerState,
    myPeerState,
    hasMicFailed,
    myVideo,
    remoteVideoStreams,
  ] = use(state, [
    'reactions',
    'identities',
    'speaking',
    'iAmSpeaker',
    'iAmOwner',
    'iAmModerator',
    'iAmAuthorized',
    'myIdentity',
    'inRoom',
    'peers',
    'peerState',
    'myPeerState',
    'hasMicFailed',
    'myVideo',
    'remoteVideoStreams',
  ]);

  let myInfo = myIdentity.info;
  let hasEnteredRoom = inRoom === roomId;

  let [showMyNavMenu, setShowMyNavMenu] = useState(false);
  let [showChat, setShowChat] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const inRoomPeerIds = peers.filter(id => peerState[id]?.inRoom);
  const nJoinedPeers = inRoomPeerIds.length;
  const [audience, setAudience] = useState(state.peers.length + 1);
  useMemo(() => setAudience(state.peers.length + 1), [state.peers]);
  const sesPeerIds = `${roomId}.peerIds`;
  sessionStorage.setItem(sesPeerIds, JSON.stringify([...inRoomPeerIds])); // MyNavMenu depends on for Follow All

  let {
    name,
    description,
    schedule,
    logoURI,
    roomLinks,
    roomSlides,
    currentSlide,
    speakers,
    moderators,
    owners,
    closed,
    stageOnly,
    lud16,
  } = room || {};

  function CacheAds() {
    const adskey = 'chatads';
    const chatads = sessionStorage.getItem(adskey);
    let fetchit = (chatads == null || chatads == undefined);
    if (fetchit) {
      (async () => {
        let [newchatads, ok] = await get(`/cimg/`);
        if (ok) {
          sessionStorage.setItem(adskey, JSON.stringify(newchatads));
        }
      })();
    }
  }
  let theCacheAds = CacheAds();

  // Cache identities in session
  function CacheIdentities(identities) {
    for(let i = 0; i < identities.length; i ++) {
      let id = identities[i];
      if (id.length == 43) {
        let jamId = id;
        const sessionStoreIdent = sessionStorage.getItem(jamId);
        let fetchit = false;
        if (sessionStoreIdent == null) {
          fetchit = true;
        }
        if (jamId == myInfo.id) {
          sessionStorage.setItem(jamId, JSON.stringify(myInfo));
          fetchit = false;
        }
        if (fetchit) {
          (async () => {
            let [remoteIdent, ok] = await get(`/identities/${jamId}`);
            if (ok) {
              sessionStorage.setItem(jamId, JSON.stringify(remoteIdent));
            }
          })();
        }
      }
    }
  }
  CacheIdentities(inRoomPeerIds);
  CacheIdentities([myInfo.id]);
  if (iModerate) {
    CacheIdentities(moderators);
    CacheIdentities(speakers);
  }

  if (!iMayEnter) {
    return <EnterRoom roomId={roomId} name={name} forbidden={true} />;
  }

  if (!iOwn && closed) {
    return (
      <EnterRoom
        roomId={roomId}
        name={name}
        description={description}
        schedule={schedule}
        closed={closed}
      />
    );
  }

  if (!hasEnteredRoom) {
    return (
      <EnterRoom
        roomId={roomId}
        name={name}
        description={description}
        schedule={schedule}
        closed={closed}
      />
    );
  }
  let {textchats} = state;
  if (textchats.length == 0) {
    (async () => {await sendTextChat("*has entered the chat!*");})();
  }

  let myPeerId = myInfo.id;
  let stagePeers = stageOnly ? peers : (speakers ?? []).filter(id => peers.includes(id));
  let audiencePeers = stageOnly ? [] : peers.filter(id => !stagePeers.includes(id));
  const nJoinedAudiencePeers = audiencePeers.filter(id => peerState[id]?.inRoom).length;

  () => setAudience(stagePeers.length + audiencePeers.length + 1);

  let {noLeave} = uxConfig;

  const colorTheme = state.room?.color ?? 'default';
  const roomColor = colors(colorTheme, state.room.customColor);
  const textColor = isDark(roomColor.avatarBg) ? roomColor.text.light : roomColor.text.dark;
  const audienceBarBG = roomColor.buttons.primary;
  const audienceBarFG = isDark(audienceBarBG) ? roomColor.text.light : roomColor.text.dark;

  return (
    <div className="h-screen w-screen flex flex-col justify-between overflow-y-scroll">

      <audio id="doorbellsound1" src="/mp3/call-to-attention-123107.mp3" volume=".5" />
      <audio id="doorbellsound2" src="/mp3/conveniencestorering-96090.mp3" volume=".5" />
      <audio id="doorbellsound3" src="/mp3/level-up-191997.mp3" />
      <audio id="doorbellsound4" src="/mp3/melancholy-ui-chime-47804.mp3" />

      <div style={{zIndex: '10', position:'absolute', top: '0px'}} className="w-screen flex flex-col justify-between">
        <RoomHeader
          colors={roomColor}
          {...{
            name,
            description,
            logoURI,
            roomLinks,
            showLinks,
            setShowLinks,
            currentSlide,
            closed,
            lud16,
            room,
          }}
          audience={(nJoinedPeers+1)}
        />


        {isRecording && (
        <div className="rounded-md mx-4 mt-2 mb-4" style={{backgroundColor: 'red', color: 'white'}}>
          RECORDING IN PROGRESS
        </div>
        )}
      </div>


      <div
        // className="overflow-y-scroll"
        // className={mqp('flex flex-col justify-between pt-2 md:pt-10 md:p-10')}
      >

        <div style={{height: isRecording ? '156px' : '128px'}}></div>

        <div className="w-full">
          <RoomSlides
            colors={roomColor}
            {...{
              roomSlides,
              currentSlide,
            }}
          />
        </div>

        <div className="hidden rounded-md m-0 p-0 mt-2 mb-4" style={{backgroundColor: audienceBarBG, color: audienceBarFG}}>
          MOTD: None set
        </div>

        { showChat ? (
        <MiniRoomMembers
          {...{
            audienceBarBG,
            audienceBarFG,
            audiencePeers,
            hasMicFailed,
            identities,
            iModerate,
            iOwn,
            iSpeak,
            moderators,
            myIdentity,
            myInfo,
            myPeerId,
            myPeerState,
            owners,
            peerState,
            reactions,
            room,
            speaking,
            stageOnly,
            stagePeers,
            state,
          }}
        />
        ) : (
        <RoomMembers
          {...{
            audienceBarBG,
            audienceBarFG,
            audiencePeers,
            hasMicFailed,
            identities,
            iModerate,
            iOwn,
            iSpeak,
            moderators,
            myIdentity,
            myInfo,
            myPeerId,
            myPeerState,
            owners,
            peerState,
            reactions,
            room,
            speaking,
            stageOnly,
            stagePeers,
            state,
          }}
        />
        )}

        {showChat && (
          <RoomChat
            {...{
              room,
            }}
          />
        )}

        <div className="h-40"></div>
      </div>
      <Navigation
        {...{
          room,
          showMyNavMenu,
          setShowMyNavMenu,
          showChat,
          setShowChat,
        }}
      />
    </div>
  );
}
