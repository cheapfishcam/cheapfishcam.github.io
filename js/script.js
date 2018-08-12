//To DO: first, make a ball for each user. then, in an RTC connection, along with the voice info, send the position of the ball.



//Create an account on Firebase, and use the credentials they give you in place of the following
var config = {
    apiKey: "AIzaSyCymOh_cE-oA2jZo9PeruW1jacINPCxshQ",
    authDomain: "testingwebrtc-d087c.firebaseapp.com",
    databaseURL: "https://testingwebrtc-d087c.firebaseio.com",
    projectId: "testingwebrtc-d087c",
    storageBucket: "testingwebrtc-d087c.appspot.com",
    messagingSenderId: "864357972075"
  };

var fb = firebase.initializeApp(config);
var database = firebase.database().ref();
var yourVideo = document.getElementById("yourVideo");
var friendsVideo = document.getElementById("friendsVideo");
var otherfriendsVideo = document.getElementById("otherfriendsVideo");
var sender;
var target;
var initiator;
var handleDataChannelOpen;
var arrayofpeerconnections = [];
var arrayofdatachannels = [];
var arrayofrunning = [];
var arrayofchannelopen = [];
var connectedusers = [];

// Generate this browser a unique ID
// On Firebase peers use this unique ID to address messages to each other
// after they have found each other in the announcement channel
var id = Math.random().toString().replace('.', '');
var remote;          // ID of the remote peer -- set once they send an offer
//-----------------------------------------------------------------

var handleBallPosChannelMessage = function (message) {
  //console.log("got position message from "+ message.val().id + " xpos " + message.val().xpos + "ypos " + message.val().ypos);
   var theSender = message.val().id;
   if(theSender != id && connectedusers != undefined  && connectedusers.length > 0) {
   var PosInArray = connectedusers.indexOf(theSender);
   if (PosInArray != -1){
   arrayofballs[PosInArray].pos.x = message.val().xpos;
   arrayofballs[PosInArray].pos.y = message.val().ypos;
 }
}
};


var ballPosChannel = database.child('positions');
ballPosChannel.on('child_added', handleBallPosChannelMessage);



var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var arrayofballs = [];

var ball = {
  pos: {x: 500,y: 300},
      direction: { x: 0, y: 0 },
  speed: 5,
      brake: 0.9, // smaller number stop faster, max 0.99999
};


var FPS = 30;

  function animate() {
	  if (ball.pos.x > 0  && ball.pos.x < 1999 || ball.pos.x <0 && ball.direction.x >0  ||  ball.pos.x > 800 && ball.direction.x <0  ) {
      ball.pos.x += ball.direction.x * ball.speed;
	  }
	  if(ball.pos.y> 0  && ball.pos.y< 1999 || ball.pos.y <0 && ball.direction.y >0  ||  ball.pos.y > 1999 && ball.direction.y <0 ){
	  ball.pos.y += ball.direction.y * ball.speed;
	  }
      ball.direction.x *= ball.brake;
      ball.direction.y *= ball.brake;

      ballPosChannel.push({id:id, xpos:ball.pos.x, ypos:ball.pos.y});

      /*if(arrayofballs.length>0){
   		 console.log(arrayofballs[0].pos.x);
   	 }*/

   updateVolumes();
  }


  function updateVolumes(){   //bug to be fixed here (actually it's a bug in the part where the video element is added):
  // more than one video element sometimes get added, the index of the ball is not right then.
//Also, we need to handle user disconnection.
      if (arrayofvideos.length == arrayofballs.length && arrayofballs.length > 0  && arrayofvideos.length > 0){
        var i;
      for (i=0;i<arrayofballs.length;i++) {
         arrayofvideos[i].volume=1/Math.max(1, 0.05 * Math.sqrt(Math.pow((ball.pos.x - arrayofballs[i].pos.x),2) + Math.pow((ball.pos.y - arrayofballs[i].pos.y),2)));
  }
    }
  }

  // background code
  function gameBack() {
    drawRect(0,0,canvas.width,canvas.height, 'Pink');
    //draw my ball
    colorCircle(ball.pos.x,ball.pos.y,10, 'Black');
    //draw the other balls
    var i;
    for (i = 0 ; i < arrayofballs.length ; i++){
    colorCircle(arrayofballs[i].pos.x,arrayofballs[i].pos.y,10, 'Green');
  }
  }
  // Rectangle Code
  function drawRect(leftX,topY,width,height, drawColor) {
    ctx.fillStyle = drawColor;
    ctx.fillRect(leftX,topY,width,height);
  }
  //Circle Code
  function colorCircle(centerX,centerY,radius, drawColor) {
    ctx.fillStyle = drawColor;
    ctx.beginPath();
    ctx.arc(centerX,centerY,radius,0,Math.PI*2,true);
    ctx.closePath();
    ctx.fill();
  }
  //Game Controls
  document.addEventListener('keydown', event => {
      if (event.keyCode === 37) { //Left
        xBall(-1);
      } else if (event.keyCode === 39) { //Right
        xBall(1);
      } else if (event.keyCode === 38) { //Up
        yBall(-1);
      } else if (event.keyCode === 40) { //Down
        yBall(1);
      }
  });
  function yBall(offset) {
    ball.direction.y += offset;
  }
  function xBall(offset) {
    ball.direction.x += offset;
  }
  //-------------------------------------------------------


//Create an account on Viagenie (http://numb.viagenie.ca/), and replace {'urls': 'turn:numb.viagenie.ca','credential': '13111994','username': 'bassemsafieldeen@gmail.com'} with the information from your account
var servers = {'iceServers': [{'urls': 'stun:stun.services.mozilla.com'}, {'urls': 'stun:stun.l.google.com:19302'}, {'urls': 'turn:numb.viagenie.ca','credential': '13111994','username': 'bassemsafieldeen@gmail.com'}]};


var arrayofvideos = [];


function startnow() {


  navigator.mediaDevices.getUserMedia({audio:true, video:true})
    .then(stream => yourVideo.srcObject = stream);
/* WebRTC Demo
 * Allows two clients to connect via WebRTC with Data Channels
 * Uses Firebase as a signalling server
 * http://fosterelli.co/getting-started-with-webrtc-data-channels
 */

/* == Announcement Channel Functions ==
 * The 'announcement channel' allows clients to find each other on Firebase
 * These functions are for communicating through the announcement channel
 * This is part of the signalling server mechanism
 *
 * After two clients find each other on the announcement channel, they
 * can directly send messages to each other to negotiate a WebRTC connection
 */

// Announce our arrival to the announcement channel
var sendAnnounceChannelMessage = function() {
  announceChannel.remove(function() {
    announceChannel.push({
      id : id
    });
  });
};

// Handle an incoming message on the announcement channel

var handleAnnounceChannelMessage = function(snapshot) {
  var message = snapshot.val();
  if (message.id != id && (connectedusers.includes(message.id) == false)) {
    remote = message.id;
    initiateWebRTCState();
    initiator = id;
  }
};

/* == Signal Channel Functions ==
 * The signal channels are used to delegate the WebRTC connection between
 * two peers once they have found each other via the announcement channel.
 *
 * This is done on Firebase as well. Once the two peers communicate the
 * necessary information to 'find' each other via WebRTC, the signalling
 * channel is no longer used and the connection becomes peer-to-peer.
 */

// Send a message to the remote client via Firebase
var sendSignalChannelMessage = function(message) {
  message.sender = id;
  database.child('messages').child(remote).push(message);
};

// Handle a WebRTC offer request from a remote client
var handleOfferSignal = function(message) {
  arrayofrunning[arrayofrunning.length - 1] = true;
  remote = message.sender;
  initiateWebRTCState();
  navigator.mediaDevices.getUserMedia({audio:true, video:true})
  .then(stream => arrayofpeerconnections[arrayofpeerconnections.length - 1].addStream(stream))
  .then(() => (arrayofpeerconnections[arrayofpeerconnections.length - 1].onicecandidate = handleICECandidate))
  .then(() => (arrayofpeerconnections[arrayofpeerconnections.length - 1].setRemoteDescription(new RTCSessionDescription(message))))
  .then(() => (  arrayofpeerconnections[arrayofpeerconnections.length - 1].createAnswer(function(sessionDescription) {
         arrayofpeerconnections[arrayofpeerconnections.length - 1].setLocalDescription(sessionDescription);
         sendSignalChannelMessage(sessionDescription.toJSON());
    }, function(err) {
      console.error('Could not create offer', err);
    })));

};

// Handle a WebRTC answer response to our offer we gave the remote client
var handleAnswerSignal = function(message) {
  arrayofpeerconnections[arrayofpeerconnections.length - 1].setRemoteDescription(new RTCSessionDescription(message));
};

// Handle an ICE candidate notification from the remote client
var handleCandidateSignal = function(message) {
  var candidate = new RTCIceCandidate(message);
  arrayofpeerconnections[arrayofpeerconnections.length - 1].addIceCandidate(candidate);
};

// This is the general handler for a message from our remote client
// Determine what type of message it is, and call the appropriate handler
var handleSignalChannelMessage = function(snapshot) {
  var message = snapshot.val();
  var sender = message.sender;
  var type = message.type;
  if (type == 'offer' && arrayofpeerconnections.length == arrayofchannelopen.length  && (arrayofchannelopen.length==0 || arrayofchannelopen[arrayofchannelopen.length - 1] == 1)) handleOfferSignal(message);
  else if (type == 'answer') handleAnswerSignal(message);
  else if (type == 'candidate' && arrayofrunning[arrayofrunning.length - 1]) handleCandidateSignal(message);
};


// Handle ICE Candidate events by sending them to our remote
// Send the ICE Candidates via the signal channel
var handleICECandidate = function(event) {
  var candidate = event.candidate;
  if (candidate) {
    candidate = candidate.toJSON();
    candidate.type = 'candidate';
    sendSignalChannelMessage(candidate);
  } else {
    console.log('All candidates sent');
  }
};

/* == Data Channel Functions ==
 * The WebRTC connection is established by the time these functions run
 * The hard part is over, and these are the functions we really want to use
 *
 * The functions below relate to sending and receiving WebRTC messages over
 * the peer-to-peer data channels
 */

// This is called when the WebRTC sending data channel is offically 'open'
handleDataChannelOpen = function() {
  arrayofchannelopen[arrayofchannelopen.length - 1] = 1;
  connectedusers.push(remote);
  arrayofballs.push({
    pos: {x: 500,y: 300},
        direction: { x: 0, y: 0 },
    speed: 5,
        brake: 0.9, // smaller number stop faster, max 0.99999
  });

  setInterval(function() {
          animate();
      gameBack();
    }, 1000/FPS);


  sendAnnounceChannelMessage();
};


// Function to offer to start a WebRTC connection with a peer
var connect = function() {
  arrayofrunning[arrayofrunning.length - 1] = true;
  arrayofpeerconnections[arrayofpeerconnections.length - 1].onicecandidate = handleICECandidate;
  arrayofpeerconnections[arrayofpeerconnections.length - 1].createOffer(function(sessionDescription) {
    arrayofpeerconnections[arrayofpeerconnections.length - 1].setLocalDescription(sessionDescription);
    sendSignalChannelMessage(sessionDescription.toJSON());
  }, function(err) {
    console.error('Could not create offer', err);
  });
};


// Function to initiate the WebRTC peerconnection and dataChannel
var initiateWebRTCState = function() {
  arrayofpeerconnections.push(new RTCPeerConnection(servers));
  arrayofrunning.push(false);
  arrayofchannelopen.push(0);
  arrayofdatachannels.push(arrayofpeerconnections[arrayofpeerconnections.length - 1].createDataChannel('myDataChannel'));
  arrayofdatachannels[arrayofdatachannels.length - 1].onopen = handleDataChannelOpen;



  arrayofpeerconnections[arrayofpeerconnections.length - 1].onaddstream = function (event) {
    var video = document.createElement("video");
    video.autoplay = true;
    document.body.appendChild(video);
    arrayofvideos.push(video);
    video.srcObject = event.stream;
  };

  navigator.mediaDevices.getUserMedia({audio:true, video:true})
  .then(stream => (initiator==id?arrayofpeerconnections[arrayofpeerconnections.length - 1].addStream(stream):console.log("not initiator"))    )
  .then(() => (initiator==id?connect():console.log("not initiator")));

};

var announceChannel = database.child('announce');
announceChannel.on('child_added', handleAnnounceChannelMessage);
var signalChannel = database.child('messages').child(id);
signalChannel.on('child_added', handleSignalChannelMessage);



// Send a message to the announcement channel
// If our partner is already waiting, they will send us a WebRTC offer
// over our Firebase signalling channel and we can begin delegating WebRTC
sendAnnounceChannelMessage();


}
