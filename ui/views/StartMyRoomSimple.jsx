import React from 'react';
import {useJam} from '../jam-core-react';

export default function StartMyRoomSimple({
    roomInfo,
    key,
    myId,
  }) {

    const [state, api] = useJam();
    const {removeSelfFromRoom} = api;
    const roomId = roomInfo?.roomId ?? 'unknown-room';
    const roomNameValue = roomInfo?.name ?? roomId;
    const roomName = roomNameValue.length > 0 ? roomNameValue : roomId;
    const roomLogoValue = roomInfo?.logoURI ?? '';
    const roomLogo = roomLogoValue.length > 0 ? roomLogoValue : 'https://i.nostr.build/o7jx.png';
    const userCount = roomInfo?.userCount ?? -1;
    const isOwner = roomInfo?.isOwner ?? false;
    const isModerator = roomInfo?.isModerator ?? false;
    const isSpeaker = roomInfo?.isSpeaker ?? false;

    var coloringStyle = {
        backgroundColor: 'rgb(210,111,210)',
        backgroundImage: 'linear-gradient(rgb(110, 47, 218), rgb(0, 0, 0))',
        color: 'rgb(255,255,255)',
        display: 'inline-block',
    };

    if (roomInfo.hidden) {
        return (
            <></>
        );
    }

    return (
        <div className="text-lg rounded-lg mr-2 w-full"
             style={coloringStyle}
             id={`myrooms-${roomId}`}
        >
            <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <a href={`./${roomId}`}>
                            <img src={roomLogo} style={{width:'32px', height:'32px', objectFit: 'cover'}} align="left" />
                            {(roomId != roomName) && (
                                <>
                                {roomId}
                                <br />
                                </>
                            )}
                            {roomName}
                            {userCount > 0 && (
                                <>
                                <br />
                                ({userCount} users chatting)
                                </>
                            )}
                        </a>
                    </td>
                    <td style={{width: '75px'}} >
                        {isOwner && ('👑')}
                        {isModerator && ('🛡️')}
                        {isSpeaker && ('🎤')}
                    </td>
                    <td style={{width: '50px'}} >
                        <button className="px-5 h-6 text-sm rounded-md"
                        title="Remove yourself from this room"
                        onClick={async (e) => {
                            e.stopPropagation();
                            let result = confirm('Are you sure you want to remove yourself from this room?');
                            if (result != true) {
                              return;
                            }
                            removeSelfFromRoom(roomId, myId);
                            let f = document.getElementById(`myrooms-${roomId}`);
                            if (f) {
                                f.style.display = 'none';
                                roomInfo.hidden = true;
                            }
                        }}
                        >
                        ❌
                        </button>
                    </td>
                </tr>
            </table>
        </div>
    );
}
