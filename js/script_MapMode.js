var config = {
    apiKey: "AIzaSyCymOh_cE-oA2jZo9PeruW1jacINPCxshQ",
    authDomain: "testingwebrtc-d087c.firebaseapp.com",
    databaseURL: "https://testingwebrtc-d087c.firebaseio.com",
    projectId: "testingwebrtc-d087c",
    storageBucket: "testingwebrtc-d087c.appspot.com",
    messagingSenderId: "864357972075"
  };
var servers = {'iceServers': [
  {'urls': 'stun:stun.services.mozilla.com'},
  {'urls': 'stun:stun.l.google.com:19302'},
  {'urls': 'turn:numb.viagenie.ca','credential': '13111994','username': 'bassemsafieldeen@gmail.com'}
]};
//The Map (see possible map style from mapbox here: https://gis.stackexchange.com/questions/244788/map-ids-to-add-mapbox-basemaps-to-leaflet-or-openlayers)
var map = L.map('map');
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
	'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
	id: 'mapbox.streets'
}).addTo(map);
var fb = firebase.initializeApp(config);
var database = firebase.database().ref();
var localVideo = document.getElementById("localVideo");   // make video a property of the ball.
var initiator;
var handleDataChannelOpen;
canvasWidth = $(window).width() - $(window).width()/15;
canvasHeight = $(window).height() - $(window).height()/15;
var broadcasting = false;  //if this is 1, the user's video is turned on on the other users' screens. When it becomes 0 again, the video turns off. This variable is sent to the other users in animate().
var localStream;
var localLcircle;
var id = Math.random().toString().replace('.', '');    // later this will be a token passed from the login backend.
var ball = {
  pos: {lat: 0,lng: 0},
  direction: { x: 0, y: 0 },
  speed: 0.005,
  brake: 0.9, // smaller number stop faster, max 0.99999
  broadcasting: false,      // move broadcasting to the localUser object.
  id: id,               // move id to the localUser object.
};
// var localUser;    This will have the same form as the objects in the arrayofballs. Add localLcircle and ball above to this object.
var radioSource = "";
var theRadio = document.getElementById("radioIframe");
theRadio.src = "";
//var country;  //country of ball
// Generate this browser a unique ID
// On Firebase peers use this unique ID to address messages to each other
// after they have found each other in the announcement channel
var remoteUsersArray = [];    // each object in this array has this form {id:id, ball:ball, Lcircle: Lcircle, pc:pc, pcIsRunning: pcIsRunning, isBroadcasting: isBroadcasting, stream: stream}. This array should not include the local ball.
// A new reoteUser object is pushed to this array as soon as a new remote user is detected.
var announceChannel = database.child('announce');
announceChannel.limitToLast(30).on('child_added', handleAnnounceChannelMessage);
var signalChannel = database.child('messages').child(id);
signalChannel.limitToLast(30).on('child_added', handleSignalChannelMessage);
var ballPosChannel = database.child('positions');     // replace this with socket.io.
ballPosChannel.limitToLast(30).on('child_added', handleBallPosChannelMessage);
//--------------------------------------------------------

// var socket = io.connect("http://localhost:8080");
// remember to add the transports thing with websockets for server deployment.

function setUpKeyboardListeners(){
  document.addEventListener('keydown', event => {
    if (event.keyCode === 37) { //Left
      ball.direction.x += -1;
      // localUser.ball.direction.x += -1;   // uncomment these
    }
    else if (event.keyCode === 39) { //Right
      ball.direction.x += 1;
      // localUser.ball.direction.x += 1;
    }
    else if (event.keyCode === 38) { //Up
      ball.direction.y += 1;
      // localUser.ball.direction.y += 1;
    }
    else if (event.keyCode === 40) { //Down
      ball.direction.y += -1;
      // localUser.ball.direction.y += -1;
    }
  });
  //Opens video on pressing spacebar
  document.addEventListener('keydown',function(e){
    if (e.keyCode==32) {
      broadcasting = true;
      localVideo.width = canvasWidth/10;
      localVideo.height = localVideo.width;
      if (localStream != undefined && localVideo.srcObject == null){
        localVideo.srcObject = localStream;
      }
    }
  });
  document.addEventListener('keyup', function(e){
    if (e.keyCode==32) {
      broadcasting = false;
      localVideo.width = 0;
      localVideo.height = 0;
      localVideo.src="";
    }
  });
}

setUpKeyboardListeners();

//Toggle Radio
/*document.getElementById("radioButton").addEventListener("click", function(){
  var theButton = document.getElementById("radioButton");
  if(theButton.value === "off"){
    theButton.value = "on";
    theRadio.src = radioSource;
  }
  else{
    theButton.value = "off";
    theRadio.src = "";
  }
});*/

function handleBallPosChannelMessage(message) {     // later, stop using firebase and broadcast the ball locations using socket.io. Why?
  var sender = message.val().id;
  for(let i = 0; i < remoteUsersArray.length ; i++){   // uncomment this.
    if (remoteUsersArray[i].id === sender){
      remoteUsersArray[i].ball.pos.lat = message.val().xpos;
      remoteUsersArray[i].ball.pos.lng = message.val().ypos;
      remoteUsersArray[i].isBroadcasting = message.val().broadcasting;
    }
  }
};

function onLocationFound(e) {
  ball.pos.lat = e.latlng.lat;     // comment these out. Not now
  ball.pos.lng = e.latlng.lng;
  localLcircle = L.circle([ball.pos.lat, ball.pos.lng], {radius: 200, color: "red", fillOpacity: 1.0}).addTo(map);
  //localUser.ball.pos.lat = e.latlng.lat;    // uncomment these.
  //localUser.ball.pos.lng = e.latlng.lng;
  //localUser.Lcircle = L.circle([localUser.ball.pos.lat, localUser.ball.pos.lng], {radius: 200, color: "red", fillOpacity: 1.0}).addTo(map);
}

map.on('locationfound', onLocationFound);
map.locate({setView: true, maxZoom: 16});

//Function to get country name given a latLng object
//There are many options for reverse geocoding service providers. see here (https://github.com/perliedman/leaflet-control-geocoder)
/*function getCountryName(latlng){
  //var geocoder = L.Control.Geocoder.opencage('f524a6e4c7544b06a00baec0c2a435a1');
  var geocoder = L.Control.Geocoder.nominatim();
  geocoder.reverse(latlng, map.options.crs.scale(map.getZoom()), function(results) {
    var r = results[0];
    if (r) {
      var tmp = r.name.split(", ");
      country = tmp[tmp.length-1];
    }
  });
}*/

//night and day zones using terminator
/*var t = L.terminator();
t.addTo(map);
setInterval(function(){updateTerminator(t)}, 500);
function updateTerminator(t) {
  var t2 = L.terminator();
  t.setLatLngs(t2.getLatLngs());
  t.redraw();
}*/

function updateVolumes(){
  //update volumes of calling balls
  for (let i=0;i<remoteUsersArray.length;i++) {   //uncomment this. May be check if the user is broadcasting.
    remoteUsersArray[i].Lcircle.getPopup().getContent().volume=1/Math.max(1, 10 * Math.sqrt(Math.pow((ball.pos.lat - remoteUsersArray[i].ball.pos.lat),2) + Math.pow((ball.pos.lng - remoteUsersArray[i].ball.pos.lng),2)));
  }
}

function animate() {
  ball.pos.lng += ball.direction.x * ball.speed;
  ball.pos.lat += ball.direction.y * ball.speed;
  ball.direction.x *= ball.brake;
  ball.direction.y *= ball.brake;
  ballPosChannel.push({id:ball.id, xpos:ball.pos.lat, ypos:ball.pos.lng, broadcasting:broadcasting});
  //localUser.ball.pos.lat += localUser.ball.direction.y * ball.speed;
  //localUser.ball.pos.lng += localUser.ball.direction.x * ball.speed;
  //localUser.ball.direction.x *= ball.brake;
  //localUser.ball.direction.y *= ball.brake;
  //socket.emit("pos update", {});    //finish that line
}

function gameBack() {
  if(localLcircle) localLcircle.setLatLng([ball.pos.lat, ball.pos.lng]);
  //if (localUser.ball != null){
  //  localUser.Lcircle.setLatLng([localUser.ball.pos.lat, localUser.ball.pos.lng]);
  //}
  map.setView(new L.LatLng(ball.pos.lat, ball.pos.lng), 8);
  //map.setView(new L.LatLng(localUser.ball.pos.lat, localUser.ball.pos.lng), 8);
  $("#videoDiv").css({"position": "absolute", "top": canvasHeight/1.5 , "left": localVideo.width/2, "width":localVideo.width, "height":localVideo.height});
  //update locations of other balls
  for (let i = 0 ; i < remoteUsersArray.length ; i++){   // uncomment this
    remoteUsersArray[i].Lcircle.setLatLng([remoteUsersArray[i].ball.pos.lat, remoteUsersArray[i].ball.pos.lng]);
    //turn on video for broadcasting balls
    if (remoteUsersArray[i].isBroadcasting == true) {
      remoteUsersArray[i].Lcircle.getPopup().getContent().width = 100/Math.max(1, 10 * Math.sqrt(Math.pow((ball.pos.lat - remoteUsersArray[i].ball.pos.lat),2) + Math.pow((ball.pos.lng - remoteUsersArray[i].ball.pos.lng),2)));
      remoteUsersArray[i].Lcircle.getPopup().getContent().height = 100/Math.max(1, 10 * Math.sqrt(Math.pow((ball.pos.lat - remoteUsersArray[i].ball.pos.lat),2) + Math.pow((ball.pos.lng - remoteUsersArray[i].ball.pos.lng),2)));
      if(remoteUsersArray[i].Lcircle.getPopup().isOpen() == false){
        remoteUsersArray[i].Lcircle.getPopup().getContent().srcObject = remoteUsersArray[i].stream;
        remoteUsersArray[i].Lcircle.openPopup();
      }
    }
    else if(remoteUsersArray[i].isBroadcasting == false && remoteUsersArray[i].Lcircle.getPopup().isOpen()) {
      remoteUsersArray[i].Lcircle.closePopup();
      remoteUsersArray[i].Lcircle.getPopup().getContent().src = "";
    }
  }
}


// if (remoteUsersArray[i].pc.iceConnectionState === 'disconnected') {    a ball shall not be deemed dead merely because its ice is disconnected. Make the signout signal work.
//
// }

function removeRemoteUserByID(userID){
  console.log("removing remote user " + userID + " because they have logged out.");
  for (let i = 0; i < remoteUsersArray.length; i++) {   // uncomment this.
    if (remoteUsersArray[i].id === userID){
      map.removeLayer(remoteUsersArray[i].Lcircle);
      remoteUsersArray.splice(i,1);
      break;
    }
  }
}

function updateRadioStation(){
  var nearATower = 0;
  for (let i = 0; i < radios.length; i++){
    if(10 * Math.sqrt(Math.pow((ball.pos.lat - radios[i].latlng.lat),2) + Math.pow((ball.pos.lng - radios[i].latlng.lng),2)) < 10){
      //theRadio.setVolume(1/Math.max(1, 10 * Math.sqrt(Math.pow((ball.pos.lat - radios[i].latlng.lat),2) + Math.pow((ball.pos.lng - radios[i].latlng.lng),2))))
      nearATower = 1;
      if(radios[i].src != radioSource){
        radioSource = radios[i].src;
        theRadio.src = radios[i].src;
      }
    }
  }
  if(nearATower == 0 && radioSource != ""){
    radioSource = "";
    theRadio.src = "";
  }
}

var FPS = 30;
setInterval(function() {
  animate();
  gameBack();
  // removeDeadBalls();    // we remove single user when they sign out now.
  //updateRadioStation();
  updateVolumes();
}, 1000/FPS);

//-----------------------------------------------------

function setUpWebRTCHandlers(remoteUserObject){   // uncomment this.
  remoteUserObject.pc.onicecandidate = function(event){   // this function is instead of handleICECandidate.
    var candidate = event.candidate;
    if (candidate) {
      candidate = candidate.toJSON();
      candidate.type = 'candidate';
      // console.log("sending ice candidate to user " + remoteUserObject.id);
      sendSignalChannelMessage(candidate, ball.id, remoteUserObject.id);
    }
    else {
      console.log('All candidates sent');
    }
  }
  remoteUserObject.pc.onaddstream = function(event){
    // console.log("remote stream received: " + event.stream);
    remoteUserObject.stream = event.stream;
  }
}

function addNewRemoteUserToRemoteUsersArray(remoteUserID){  // uncomment this.
  if (checkRemoteUserInArray(remoteUserID) === false) {
    console.log("adding new remote user with id " + remoteUserID + " to remoteUsersArray");
    var newBall = {
      pos: {lat: 0, lng: 0},   // the location of the remoteUser's ball will be updated elsewhere.
      direction: {x: 0, y: 0},
      speed: 0.005,
      brake: 0.9 // smaller number stop faster, max 0.99999
    }
    var newLcircle = L.circle([0, 0], {radius: 200, color: "red", fillOpacity: 1.0}).addTo(map);
    var tmpvid = L.DomUtil.create('video');
    tmpvid.autoplay = true;
    tmpvid.height = 100; tmpvid.width = 100;
    tmpvid.srcObject = null;  // this is set in the onaddstream handler.
    newLcircle.bindPopup(tmpvid, {maxWidth: "auto", closeButton: false});
    var newRemoteUser = {
      id: remoteUserID,
      ball: newBall,
      Lcircle: newLcircle,  //Lcircle contains the video element. It is bound to it when the stream is added.
      pc: new RTCPeerConnection(servers),
      pcIsRunning: false,
      isBroadcasting: false,
      stream: null
    }
    setUpWebRTCHandlers(newRemoteUser);
    remoteUsersArray.push(newRemoteUser);
  }
}

// Announce our arrival to the announcement channel
function sendAnnounceChannelMessage(type, receiverID) {   // this basically says, "hey everybody, I am online now."  Upon hearing that, everybody should call you.
  announceChannel.remove(function() {announceChannel.push({id : ball.id, type: type, receiver: receiverID});});   //  type can be either "ping" or "pong" or "signing out". "ping" means "hey, I have just arrived." "pong" means "cool, I am here, too".
};

// Handle an incoming message on the announcement channel
function handleAnnounceChannelMessage(snapshot) {   // push a new remote user object to the remoteUsersArray here.  Hey, this is like socket.on().
  var message = snapshot.val();
  console.log("received message: " + String(message));
  // if (message.id != ball.id && (connectedusers.includes(message.id) == false)) {
  console.log(message.receiver);
  console.log(message.id != ball.id, message.receiver === undefined, message.receiver === ball.id);
  if (message.id != ball.id && message.receiver === undefined || message.receiver === ball.id) {
    // remote = message.id; //comment this out
    // initiateWebRTCState(); // comment this out
    var sender = message.id;  //uncomment this.
    // if (checkRemoteUserInArray(sender) === false) {
    //   console.log("adding new remote user with id " + sender + " to remoteUsersArray");
    addNewRemoteUserToRemoteUsersArray(sender);  //uncomment this   /. this is  a bug. It's called on all messages. This is bad because pongs can come from any user. So there are too many pongs.
    // }
    if (message.type === "ping"){
      sendAnnounceChannelMessage("pong", sender); // later send the pong only to the user who sent the ping. For now, just check that the user pc is not already running before initiating --- do this check at the beginning of initiateCallToRemoteUser.
    } else if (message.type === "pong" ) {   // newly arrived user is one who calls. Does so after receiving a pong. At this point, the old user has been added to the remoteUsersArray.
      initiator = ball.id; // keep this   // consider making this a property of each remoteUser. Would probably be more robust.
      initiateCallToRemoteUser(sender);    //uncomment this. This line should be exectuted strictly after the previous one has finished being executed. Check that it is (that a new user has been added to the array), and add a fix later.
    } else if (message.type === "signing out") {
      console.log("remote user " + message.sender + "has left");
      removeRemoteUserByID(message.id);
    }
  }
};

function checkRemoteUserInArray(userID){
  for (let i = 0; remoteUsersArray.length; i++){
    if (remoteUsersArray[i] === userID){
      return true;
    }
  }
  return false;
}

// Send a message to the remote client via Firebase
// function sendSignalChannelMessage(message) {   //modify this function to also take a a senderID and a receiver id.
function sendSignalChannelMessage(message, senderID, receiverID) {   //uncomment this
  message.sender = senderID;   //uncomment this
  message.receiver = receiverID;   //uncomment this
  database.child('messages').child(receiverID).push(message);
}

// Handle a WebRTC offer request from a remote client
function handleOfferSignal(message) {    // get the offer sender from the message.
  var sender = message.sender;  // uncomment this.
  console.log("received an offer from user " + sender);
  for(let i = 0; i < remoteUsersArray.length ; i++){   // uncomment this.
    if (remoteUsersArray[i].id === sender){
      remoteUsersArray[i].pcIsRunning = true;
      if (localStream === undefined){
        navigator.mediaDevices.getUserMedia({audio:true, video:true})     // this should not be needed, as we have already captured media when the page was loaded.
          .then(stream => remoteUsersArray[i].pc.addStream(stream))   // you might need to do this the await way.
          .then(() => {
            console.log("setting remote description of user " + sender);
            remoteUsersArray[i].pc.setRemoteDescription(new RTCSessionDescription(message));
            })
          .then(() => remoteUsersArray[i].pc.createAnswer(
            function(sessionDescription) {
              remoteUsersArray[i].pc.setLocalDescription(sessionDescription);
              console.log("sending an answer to user " + sender);
              sendSignalChannelMessage(sessionDescription.toJSON(), ball.id, sender);
            },
            function(err) {
              console.error('Could not create offer', err);
            }
          ));
      } else {
        remoteUsersArray[i].pc.addStream(localStream);
        remoteUsersArray[i].pc.setRemoteDescription(new RTCSessionDescription(message));
        remoteUsersArray[i].pc.createAnswer(
          function(sessionDescription) {
            remoteUsersArray[i].pc.setLocalDescription(sessionDescription);
            console.log("sending an answer to user " + sender);
            sendSignalChannelMessage(sessionDescription.toJSON(), ball.id, sender);
          },
          function(err) {
            console.error('Could not create offer', err);
          }
        );
      }
    }
  }
};

// Handle a WebRTC answer response to our offer we gave the remote client
async function handleAnswerSignal(message) { // set the session description only for the remoetUser who sent the answer.
  var sender = message.sender;
  // console.log("received an answer from user " + sender);
  for(let i = 0; i < remoteUsersArray.length ; i++){   // uncomment this.
    if (remoteUsersArray[i].id === sender){
      // console.log("setting remote description of user " + sender);
      await remoteUsersArray[i].pc.setRemoteDescription(new RTCSessionDescription(message));
    }
  }
};

// Handle an ICE candidate notification from the remote client
function handleCandidateSignal(message) {    // move this inside the function where it's called so that you have the id of the remote who sent the message. Then, you can add the candidate to the user who sent the candidate and not the last user in the array.
  var candidate = new RTCIceCandidate(message);
  var sender = message.sender; // uncomment this
  for(let i = 0; i < remoteUsersArray.length ; i++){   // uncomment this.
    if (remoteUsersArray[i].id === sender){
      // console.log("adding ice candidates from user " + sender);
      // if (remoteUsersArray[i].pc == null && remoteUsersArray[i].pc.remoteDescription ==  null) {
        remoteUsersArray[i].pc.addIceCandidate(candidate);
      // } else {
        console.log("Debugging: is pc null? ", remoteUsersArray[i].pc == null);
        console.log("Debugging: is pc remoteDescription null? ", remoteUsersArray[i].pc.remoteDescription ==  null);
      // }
    }
  }
};

function handleSignalChannelMessage(snapshot) {   // check that the receiver is localUser.  No need to check for the receiver in the functions called below.
  var message = snapshot.val();
  var receiver = message.receiver;  // uncomment this.
  var type = message.type;
  if (receiver === ball.id) {  //uncomment this
    if (type === 'offer') handleOfferSignal(message);   // you might need a check on pcIsBroadcasting here.
    else if (type === 'answer') handleAnswerSignal(message);
    else if (type === 'candidate') handleCandidateSignal(message);
  } //uncomment this
};

function initiateCallToRemoteUser(remoteUserID) {
  for(let i = 0; i < remoteUsersArray.length ; i++){   // uncomment this.
    if (remoteUsersArray[i].id === remoteUserID && remoteUsersArray[i].pcIsRunning === false){
      remoteUsersArray[i].pcIsRunning = true;
      // console.log("sending a offer to user " + remoteUserID);
      if (localStream === undefined) {
        console.log("getting user media");
        navigator.mediaDevices.getUserMedia({audio:true, video:true})   // later, check first if a localStream exists.
          .then(stream => {
            localStream = stream;
            remoteUsersArray[i].pc.addStream(stream);
          })   // later, get user media only when the spacebar is pressed.
          .then(() => {
            remoteUsersArray[i].pc.createOffer(function(sessionDescription) {
              remoteUsersArray[i].pc.setLocalDescription(sessionDescription);
              sendSignalChannelMessage(sessionDescription.toJSON(), ball.id, remoteUserID);
            }, function(err) {
              console.error('Could not create offer', err);
            });
          });
      } else {
        remoteUsersArray[i].pc.addStream(localStream);
        remoteUsersArray[i].pc.createOffer(function(sessionDescription) {
          remoteUsersArray[i].pc.setLocalDescription(sessionDescription);
          sendSignalChannelMessage(sessionDescription.toJSON(), ball.id, remoteUserID);
        }, function(err) {
          console.error('Could not create offer', err);
        });
      }
    }
  }
}

window.onload = function(){
  sendAnnounceChannelMessage("ping", null);   // you can't send a ping to a specific user because you don't know who the online users are; you are still feeling out who is online.
}                                      // but you should send the pong to a specific user.

window.onbeforeunload = function(){
  // close the connections before leaving. More robust this way.
  sendAnnounceChannelMessage("signing out", null);   // null means send it to everyone
  return null;
}
