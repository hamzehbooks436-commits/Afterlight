import {initializeApp} from 'firebase/app';
import {getAuth,signInAnonymously} from 'firebase/auth';
import {getDatabase,ref,get,set,onValue,runTransaction,onDisconnect,remove} from 'firebase/database';
import {firebaseConfig} from './firebase-config.js';
import {sharedFrom,sharedChanges,mergeChanges} from './online-state.js';

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const database=getDatabase(app);
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const cleanCode=value=>String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,20);
export function newRoomCode(){const bytes=crypto.getRandomValues(new Uint8Array(20));return [...bytes].map(byte=>alphabet[byte%alphabet.length]).join('');}
async function user(){if(auth.currentUser)return auth.currentUser;return (await signInAnonymously(auth)).user;}
const cleanName=value=>String(value||'Survivor').trim().slice(0,24)||'Survivor';

export class OnlineSession{
  constructor(code,uid,name,onShared,onPeers,onStatus){
    Object.assign(this,{code,uid,name,onShared,onPeers,onStatus});
    this.room=ref(database,`rooms/${code}`);this.presence=ref(database,`rooms/${code}/presence/${uid}`);
    this.baseline=null;this.unsub=[];this.closed=false;this.writing=false;this.queued=null;
  }
  static async create(name,state,callbacks){
    const account=await user();
    for(let tries=0;tries<3;tries++){
      const code=newRoomCode(),session=new OnlineSession(code,account.uid,cleanName(name),...callbacks);
      const created=await runTransaction(session.room,current=>current===null?{
        owner:account.uid,createdAt:Date.now(),members:{[account.uid]:{name:session.name,joinedAt:Date.now()}},state:sharedFrom(state)
      }:undefined,{applyLocally:false});
      if(created.committed){await session.start(created.snapshot.val().state);return session;}
    }
    throw new Error('Could not create an invite code. Try again.');
  }
  static async join(code,name,callbacks){
    code=cleanCode(code);if(code.length!==20)throw new Error('Enter the full 20-character invite code.');
    const account=await user(),session=new OnlineSession(code,account.uid,cleanName(name),...callbacks);
    const snapshot=await get(session.room);
    if(!snapshot.exists())throw new Error('Room not found. Check the invite code.');
    if(!snapshot.child(`members/${account.uid}`).exists()){
      if(snapshot.child('members').numChildren()>=4)throw new Error('This room already has four players.');
      await set(ref(database,`rooms/${code}/members/${account.uid}`),{name:session.name,joinedAt:Date.now()});
    }
    await session.start(snapshot.child('state').val());return session;
  }
  async start(initial){
    this.baseline=structuredClone(initial);
    this.unsub.push(onValue(ref(database,`rooms/${this.code}/state`),snap=>{
      if(this.closed||!snap.exists())return;
      const incoming=snap.val();
      if(JSON.stringify(incoming)===JSON.stringify(this.baseline))return;
      this.baseline=structuredClone(incoming);this.onShared(incoming);
    },error=>this.onStatus(error.message)));
    this.unsub.push(onValue(ref(database,`rooms/${this.code}/presence`),snap=>{const peers=snap.val()||{};this.onPeers(peers);this.onStatus(`${Object.keys(peers).length}/4 survivors online`);},error=>this.onStatus(error.message)));
    onDisconnect(this.presence).remove().catch(error=>this.onStatus(`Presence cleanup unavailable: ${error.message}`));
  }
  async publishState(state){
    if(this.closed||!this.baseline)return;
    if(this.writing){this.queued=state;return;}
    const after=sharedFrom(state),changes=sharedChanges(this.baseline,after);
    if(!Object.keys(changes).length)return;
    this.writing=true;
    try{
      const result=await runTransaction(ref(database,`rooms/${this.code}/state`),current=>current?mergeChanges(current,changes):undefined,{applyLocally:false});
      if(result.committed)this.baseline=result.snapshot.val();
    }catch(error){this.onStatus(`Sync failed: ${error.message}`);}
    finally{this.writing=false;if(this.queued){const next=this.queued;this.queued=null;this.publishState(next);}}
  }
  async publishPosition(zone,position,yaw){
    if(this.closed)return;
    try{await set(this.presence,{name:this.name,zone,x:position.x,y:position.y,z:position.z,yaw,at:Date.now()});}
    catch(error){this.onStatus(`Presence failed: ${error.message}`);}
  }
  async close(){
    this.closed=true;this.unsub.forEach(stop=>stop());
    try{await remove(this.presence);}catch{}
  }
}
