import {update} from 'minimal-state';
import {useAction, useOn, useRootState} from '../lib/state-tree';
import {sendPeerEvent} from '../lib/swarm';
import {actions} from './state';

function TextChat({swarm}) {
  const state = useRootState();

  useOn(swarm.peerEvent, 'text-chat', (peerId, textchat) => {
    if(textchat) showTextChat(peerId, textchat);
  });

  function incrementUnread(roomId) {
    let bufferSize = localStorage.getItem(`textchat.bufferSize`) || 50;
    let n = Math.floor(sessionStorage.getItem(`${roomId}.textchat.unread`) ?? 0) + 1;
    sessionStorage.setItem(`${roomId}.textchat.unread`, n);
  }

  function showTextChat(peerId, textchat) {
    let bufferSize = localStorage.getItem(`textchat.bufferSize`) || 50;
    let {roomId, textchats} = state;
    if (!textchats) textchats = [];
    let lastline = textchats.slice(-1);
    if ((lastline.length == 0) || (lastline[0].length != 2) || (lastline[0][0] != peerId) || (lastline[0][1] != textchat)) {
        textchats.push([peerId, textchat]);
        state.textchats = textchats.slice(-1 * bufferSize);
        update(state, 'textchats');

        let okToIncrement = true;
        if (textchat.startsWith("*has entered the chat!*")) okToIncrement = false;
        if (handleSessionCommand("srfm",peerId,roomId,textchat)) okToIncrement = false;
        if (okToIncrement) incrementUnread(roomId);
    }
  }

  function handleSessionCommand(cmd, peerId, roomId, textchat) {
    let k = `/${cmd}`;
    if (textchat && textchat.startsWith(k)) {
      sessionStorage.setItem(`${roomId}.${cmd}`, (textchat.split(k)[1]).trim());
      sessionStorage.setItem(`${roomId}.${cmd}.time`, Math.floor(Date.now()/1000));
      sessionStorage.setItem(`${roomId}.${cmd}.peer`, peerId);
      return true;
    }
    return false;
  }

  return function TextChat() {
    let [isTextChat, textchat] = useAction(actions.TEXT_CHAT);
    if (isTextChat) {
      sendPeerEvent(swarm, 'text-chat', textchat);
      //showTextChat(swarm.myPeerId, textchat);
    }
  };

}

export {TextChat};