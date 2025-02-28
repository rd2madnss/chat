import {post, deleteRequest} from './backend';

export const addAdmin = async (state, id) => {
  return await post(state, `/admin/${id}`, {});
};

export const removeAdmin = async (state, id) => {
  return await deleteRequest(state, `/admin/${id}`, {});
};

export const deleteOldRooms = async state => {
  return await deleteRequest(state, `/oldrooms/`, {});
};

export const addPermanentRoom = async (state, roomId) => {
  return await post(state, `/permanentrooms/${roomId}`, {});
};

export const removePermanentRoom = async (state, roomId) => {
  return await deleteRequest(state, `/permanentrooms/${roomId}`, {});
};
