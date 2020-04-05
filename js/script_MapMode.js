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
var fb = firebase.initializeApp(config);
var database = firebase.database().ref();
var localVideo = document.getElementById("localVideo");   // make video a property of the ball.
// var sender;
// var target;
var initiator;
var handleDataChannelOpen;
// var arrayofpeerconnections = [];    // make peer connections a property of the remote balls.
canvasWidth = $(window).width() - $(window).width()/15;
canvasHeight = $(window).height() - $(window).height()/15;
// var arrayofrunning = [];    // don't store things in different arrays; just have one array of balls with different properties.
// var arrayofchannelopen = [];
// var connectedusers = [];
var broadcasting = false;  //if this is 1, the user's video is turned on on the other users' screens. When it becomes 0 again, the video turns off. This variable is sent to the other users in animate().
var localStream;
// var arrayofballs = [];
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
// var arrayofLcircles = [];
// var arrayofstreams = [];
var radioSource = "";
var theRadio = document.getElementById("radioIframe");
theRadio.src = "";
//var country;  //country of ball
// Generate this browser a unique ID
// On Firebase peers use this unique ID to address messages to each other
// after they have found each other in the announcement channel
var remoteUsersArray = [];    // each object in this array has this form {id:id, ball:ball, Lcircle: Lcircle, pc:pc, pcIsRunning: pcIsRunning, isBroadcasting: isBroadcasting, stream: stream}. This array should not include the local ball.
// A new reoteUser object is pushed to this array as soon as a new remote user is detected.
// var remote;          // ID of the remote peer -- set once they send an offer
var announceChannel = database.child('announce');
announceChannel.limitToLast(30).on('child_added', handleAnnounceChannelMessage);
var signalChannel = database.child('messages').child(id);
signalChannel.limitToLast(30).on('child_added', handleSignalChannelMessage);
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

var handleBallPosChannelMessage = function (message) {     // later, stop using firebase and broadcast the ball locations using socket.io. Why?
  var sender = message.val().id;
  // if(sender != id && connectedusers != undefined  && connectedusers.length > 0 && arrayofballs.length == connectedusers.length) {   // comment this out.
  //   var PosInArray = connectedusers.indexOf(sender);
  //   if (PosInArray != -1){
  //     arrayofballs[PosInArray].pos.lat = message.val().xpos;
  //     arrayofballs[PosInArray].pos.lng = message.val().ypos;
  //     arrayofballs[PosInArray].broadcasting = message.val().broadcasting;
  //   }
  // }
  for(let i = 0; i < remoteUsersArray.length ; i++){   // uncomment this.
    if (remoteUsersArray[i].id === sender){
      remoteUsersArray[i].ball.pos.lat = message.val().xpos;
      remoteUsersArray[i].ball.pos.lng = message.val().ypos;
      remoteUsersArray[i].isBroadcasting = message.val().broadcasting;
    }
  }
};

var ballPosChannel = database.child('positions');     // replace this with socket.io.
ballPosChannel.limitToLast(30).on('child_added', handleBallPosChannelMessage);

//The Map (see possible map style from mapbox here: https://gis.stackexchange.com/questions/244788/map-ids-to-add-mapbox-basemaps-to-leaflet-or-openlayers)
var map = L.map('map');
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
	'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
	id: 'mapbox.streets'
}).addTo(map);

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
  // if (arrayofLcircles.length > 0 && arrayofLcircles.length == arrayofballs.length){  // comment this out.
  //   for (let i=0;i<arrayofLcircles.length;i++) {
  //     arrayofLcircles[i].getPopup().getContent().volume=1/Math.max(1, 10 * Math.sqrt(Math.pow((ball.pos.lat - arrayofballs[i].pos.lat),2) + Math.pow((ball.pos.lng - arrayofballs[i].pos.lng),2)));
  //   }
  // }
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
  // for (let i = 0 ; i < arrayofballs.length ; i++){    // comment this out.
  //   arrayofLcircles[i].setLatLng([arrayofballs[i].pos.lat, arrayofballs[i].pos.lng]);
  //   //turn on video for broadcasting balls
  //   if (arrayofballs[i].broadcasting == 1) {
  //     arrayofLcircles[i].getPopup().getContent().width = 100/Math.max(1, 10 * Math.sqrt(Math.pow((ball.pos.lat - arrayofballs[i].pos.lat),2) + Math.pow((ball.pos.lng - arrayofballs[i].pos.lng),2)));
  //     arrayofLcircles[i].getPopup().getContent().height = 100/Math.max(1, 10 * Math.sqrt(Math.pow((ball.pos.lat - arrayofballs[i].pos.lat),2) + Math.pow((ball.pos.lng - arrayofballs[i].pos.lng),2)));
  //     if(arrayofLcircles[i].getPopup().isOpen() == false){
  //       arrayofLcircles[i].getPopup().getContent().srcObject = arrayofstreams[i];
  //       arrayofLcircles[i].openPopup();
  //     }
  //   }
  //   else if(arrayofballs[i].broadcasting == 0 && arrayofLcircles[i].getPopup().isOpen()) {
  //     arrayofLcircles[i].closePopup();
  //     arrayofLcircles[i].getPopup().getContent().src = "";
  //   }
  // }

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

function removeDeadBalls() {
  // for (let i=0;i<arrayofpeerconnections.length;i++) {   // comment this out.
  //   if (arrayofpeerconnections[i].iceConnectionState === 'disconnected'){
  //     if(arrayofpeerconnections.length == arrayofballs.length && arrayofballs.length == arrayofLcircles.length && arrayofLcircles.length == arrayofrunning.length && arrayofrunning.length == arrayofchannelopen.length && arrayofchannelopen.length == connectedusers.length && connectedusers.length == arrayofstreams.length ){
  //       arrayofpeerconnections.splice(i,1);
  //       arrayofballs.splice(i,1);
  //       map.removeLayer(arrayofLcircles[i]);
  //       arrayofLcircles.splice(i,1);
  //       arrayofrunning.splice(i,1);
  //       arrayofstreams.splice(i,1);
  //       arrayofchannelopen.splice(i,1);
  //       connectedusers.splice(i,1);
  //       i--;
  //     }
  //   }
  // }
  for (let i = 0; i < remoteUsersArray.length; i++) {   // uncomment this.
    if (remoteUsersArray[i].pc.iceConnectionState === 'disconnected'){
      map.removeLayer(remoteUsersArray[i].Lcircle);
      remoteUsersArray.splice(i,1);
      i--;
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
  removeDeadBalls();
  updateRadioStation();
  updateVolumes();
}, 1000/FPS);


//-----------------------------------------------------

function setUpWebRTCHandlers(remoteUserObject){   // uncomment this.
  remoteUserObject.pc.onicecandidate = function(event){   // this function is instead of handleICECandidate.
    var candidate = event.candidate;
    if (candidate) {
      candidate = candidate.toJSON();
      candidate.type = 'candidate';
      console.log("sending ice candidate to user " + remoteUserObject.id);
      sendSignalChannelMessage(candidate, ball.id, remoteUserObject.id);
    }
    else {
      console.log('All candidates sent');
    }
  }
  remoteUserObject.pc.onaddstream = function(event){
    // var tmpvid = L.DomUtil.create('video');
    // tmpvid.autoplay = true;
    // tmpvid.height = 100; tmpvid.width = 100;
    // remoteUserObject.Lcircle.getPopup().getContent().srcObject = event.stream;  // may be this, too, is needed. Test and see.
    console.log("remote stream received: " + event.stream);
    remoteUserObject.stream = event.stream;
    // remoteUserObject.Lcircle.bindPopup(tmpvid, {maxWidth: "auto", closeButton: false});
  }
}

function addNewRemoteUserToRemoteUsersArray(remoteUserID){  // uncomment this.
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
  // newRemoteUser.pc.addStream(localStream);
  setUpWebRTCHandlers(newRemoteUser);
  remoteUsersArray.push(newRemoteUser);
  // return Promise.resolve(newRemoteUser);  // just because we need functions after this one to wait a bit.
}

// Announce our arrival to the announcement channel
function sendAnnounceChannelMessage(type) {   // this basically says, "hey everybody, I am online now."  Upon hearing that, everybody should call you.
  announceChannel.remove(function() {announceChannel.push({id : ball.id, type: type});});   // type can be either "ping" or "pong". "ping" means "hey, I have just arrived." "pong" means "cool, I am here, too".
};

// Handle an incoming message on the announcement channel
function handleAnnounceChannelMessage(snapshot) {   // push a new remote user object to the remoteUsersArray here.
  var message = snapshot.val();
  // if (message.id != ball.id && (connectedusers.includes(message.id) == false)) {
  if (message.id != ball.id) {
    // remote = message.id; //comment this out
    // initiateWebRTCState(); // comment this out
    var sender = message.id;  //uncomment this.
    console.log("adding new remote user with id " + sender + " to remoteUsersArray");
    addNewRemoteUserToRemoteUsersArray(sender);  //uncomment this
    if (message.type === "ping"){
      sendAnnounceChannelMessage("pong");
    } else {   // newly arrived user is one who calls. Does so after receiving a pong. At this point, the old user has been added to the remoteUsersArray.
      initiator = ball.id; // keep this   // consider making this a property of each remoteUser. Would probably be more robust.
      initiateCallToRemoteUser(sender);    //uncomment this. This line should be exectuted strictly after the previous one has finished being executed. Check that it is (that a new user has been added to the array), and add a fix later.
    }
  }
};

// Send a message to the remote client via Firebase
// function sendSignalChannelMessage(message) {   //modify this function to also take a a senderID and a receiver id.
function sendSignalChannelMessage(message, senderID, receiverID) {   //uncomment this
  // message.sender = ball.id;   // with every webrtc message comes the sender's id. Good. We should also sent the receiver's id. comment this out.
  message.sender = senderID;   //uncomment this
  message.receiver = receiverID;   //uncomment this
  database.child('messages').child(receiverID).push(message);
}

// Handle a WebRTC offer request from a remote client
function handleOfferSignal(message) {    // get the offer sender from the message.
  // remote = message.sender;    // make remote a local variable. But it is not user locally.
  // initiateWebRTCState();
  // arrayofrunning[arrayofrunning.length - 1] = true;
  // navigator.mediaDevices.getUserMedia({audio:true, video:true})
  //   .then(stream => arrayofpeerconnections[arrayofpeerconnections.length - 1].addStream(stream))   // add a stream only to the pc corresponding to the user who sent the message.
  //   .then(() => (arrayofpeerconnections[arrayofpeerconnections.length - 1].onicecandidate = handleICECandidate))   // comment this out, as it's already set when the remoteUser is created.
  //   .then(() => (arrayofpeerconnections[arrayofpeerconnections.length - 1].setRemoteDescription(new RTCSessionDescription(message))))
  //   .then(() => (arrayofpeerconnections[arrayofpeerconnections.length - 1].createAnswer(
  //     function(sessionDescription) {
  //       arrayofpeerconnections[arrayofpeerconnections.length - 1].setLocalDescription(sessionDescription);
  //       sendSignalChannelMessage(sessionDescription.toJSON());
  //     },
  //     function(err) {
  //        console.error('Could not create offer', err);
  //       })));

  var sender = message.sender;  // uncomment this.
  console.log("received an offer from user " + sender);
  for(let i = 0; i < remoteUsersArray.length ; i++){   // uncomment this.
    if (remoteUsersArray[i].id === sender){
      remoteUsersArray[i].pcIsRunning = true;
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
    }
  }
};

// Handle a WebRTC answer response to our offer we gave the remote client
function handleAnswerSignal(message) { // set the session description only for the remoetUser who sent the answer.
  var sender = message.sender;
  console.log("received an answer from user " + sender);
  // arrayofpeerconnections[arrayofpeerconnections.length - 1].setRemoteDescription(new RTCSessionDescription(message));
  for(let i = 0; i < remoteUsersArray.length ; i++){   // uncomment this.
    if (remoteUsersArray[i].id === sender){
      console.log("setting remote description of user " + sender);
      remoteUsersArray[i].pc.setRemoteDescription(new RTCSessionDescription(message));
    }
  }
  // connectedusers.push(remote); // later, remove this. It should be redundant if things are done properly.
};

// Handle an ICE candidate notification from the remote client
function handleCandidateSignal(message) {    // move this inside the function where it's called so that you have the id of the remote who sent the message. Then, you can add the candidate to the user who sent the candidate and not the last user in the array.
  var candidate = new RTCIceCandidate(message);
  var sender = message.sender; // uncomment this
  // console.log("current Remote description ",  arrayofpeerconnections[arrayofpeerconnections.length - 1].currentRemoteDescription);
  // if(arrayofpeerconnections[arrayofpeerconnections.length - 1].currentRemoteDescription){     // this if condition should not be needed.
    // arrayofpeerconnections[arrayofpeerconnections.length - 1].addIceCandidate(candidate);
  for(let i = 0; i < remoteUsersArray.length ; i++){   // uncomment this.
    if (remoteUsersArray[i].id === sender){
      console.log("adding ice candidates from user " + sender);
      remoteUsersArray[i].pc.addIceCandidate(candidate);
    }
  }
  // } else { console.log("no remote description. won't work, bitch"); }
};

function handleSignalChannelMessage(snapshot) {   // check that the receiver is localUser.  No need to check for the receiver in the functions called below.
  var message = snapshot.val();
  // var sender = message.sender;   // comment this out
  var receiver = message.receiver;  // uncomment this.
  var type = message.type;
  if (receiver === ball.id) {  //uncomment this
    // if (type === 'offer'  && (arrayofchannelopen.length==0 || arrayofchannelopen[arrayofchannelopen.length - 1] == 1)) handleOfferSignal(message);
    if (type === 'offer') handleOfferSignal(message);   // you might need a check on pcIsBroadcasting here.
    else if (type === 'answer') handleAnswerSignal(message);
    else if (type === 'candidate') handleCandidateSignal(message);
    // else if (type === 'candidate' && arrayofrunning[arrayofrunning.length - 1]) handleCandidateSignal(message);
  } //uncomment this
};

// function handleICECandidate(event) {   // send the candidate to a specific user.
//   var candidate = event.candidate;
//   if (candidate) {
//     candidate = candidate.toJSON();
//     candidate.type = 'candidate';
//     sendSignalChannelMessage(candidate);
//   }
//   else {
//     console.log('All candidates sent');
//   }
// };

// Function to offer to start a WebRTC connection with a peer
// function connect() {    // later, this will not be needed, so comment it out.
//   arrayofrunning[arrayofrunning.length - 1] = true;
//   arrayofpeerconnections[arrayofpeerconnections.length - 1].onicecandidate = handleICECandidate;
//   arrayofpeerconnections[arrayofpeerconnections.length - 1].createOffer(function(sessionDescription) {
//     arrayofpeerconnections[arrayofpeerconnections.length - 1].setLocalDescription(sessionDescription);
//     sendSignalChannelMessage(sessionDescription.toJSON());
//   }, function(err) {
//     console.error('Could not create offer', err);
//   });
// };

function initiateCallToRemoteUser(remoteUserID) {    // this is instead of connect().
  for(let i = 0; i < remoteUsersArray.length ; i++){   // uncomment this.
    if (remoteUsersArray[i].id === remoteUserID){
      remoteUsersArray[i].pcIsRunning = true;
      console.log("sending a offer to user " + remoteUserID);
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
    }
  }
}

// Function to initiate the WebRTC peerconnection and dataChannel
// function initiateWebRTCState() {
//   arrayofpeerconnections.push(new RTCPeerConnection(servers));    // do this when the remote's arrival is announced, not here.
//   arrayofrunning.push(false);   // same
//   arrayofchannelopen.push(0);  // same
//   arrayofpeerconnections[arrayofpeerconnections.length - 1].onaddstream = function (event) {  // same
//     if (initiator!=ball.id){connectedusers.push(remote);}
//     arrayofballs.push({
//       pos: {lat: 0,lng: 0},
//       direction: { x: 0, y: 0 },
//       speed: 0.005,
//       brake: 0.9, // smaller number stop faster, max 0.99999
//       broadcasting: 0,
//       id: remote,      // remove id from ball. It's already in the remoteUser object.
//     });
//     arrayofLcircles.push(L.circle([0, 0], {radius: 200, color: "red", fillOpacity: 1.0}).addTo(map));
//     arrayofstreams.push(event.stream);
//     var tmpvid = L.DomUtil.create('video');
//     tmpvid.autoplay = true;
//     tmpvid.height = 100; tmpvid.width = 100;
//     tmpvid.srcObject = event.stream;
//     arrayofLcircles[arrayofLcircles.length-1].bindPopup(tmpvid, {maxWidth: "auto", closeButton: false});
//     arrayofchannelopen[arrayofchannelopen.length - 1] = 1;
//     if (arrayofchannelopen.length > 1 && arrayofchannelopen[arrayofchannelopen.length - 2] == 0) {
//       arrayofchannelopen.splice(arrayofchannelopen.length - 2, 1);
//       arrayofpeerconnections.splice(arrayofpeerconnections.length - 2, 1);
//       arrayofrunning.splice(arrayofrunning.length - 2, 1);
//     }
//     sendAnnounceChannelMessage();
//   };
//   navigator.mediaDevices.getUserMedia({audio:true, video:true})
//     .then(stream => (initiator==ball.id?arrayofpeerconnections[arrayofpeerconnections.length - 1].addStream(stream):console.log("not initiator"))    )
//     .then(() => (initiator==ball.id?connect():console.log("not initiator")));
// };

window.onload = function(){
  // navigator.mediaDevices.getUserMedia({audio:true, video:true})
  //   .then(stream => localStream = stream);   // later, get user media only when the spacebar is pressed.
  sendAnnounceChannelMessage("ping");
}
