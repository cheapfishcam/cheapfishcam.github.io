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
var canvasColor = 'white';
var mappos;
var map;
//var newcirc = 0;
// Generate this browser a unique ID
// On Firebase peers use this unique ID to address messages to each other
// after they have found each other in the announcement channel
var id = Math.random().toString().replace('.', '');
var remote;          // ID of the remote peer -- set once they send an offer
//-----------------------------------------------------------------

var handleBallPosChannelMessage = function (message) {
  //console.log("got position message from "+ message.val().id + " xpos " + message.val().xpos + "ypos " + message.val().ypos);
   var theSender = message.val().id;
   if(theSender != id && connectedusers != undefined  && connectedusers.length > 0 && arrayofballs.length == connectedusers.length) {
   var PosInArray = connectedusers.indexOf(theSender);
   if (PosInArray != -1){
   arrayofballs[PosInArray].pos.x = message.val().xpos;   //x will become long
   arrayofballs[PosInArray].pos.y = message.val().ypos;   //y will become lat
 }
}
};


var ballPosChannel = database.child('positions');
ballPosChannel.limitToLast(100).on('child_added', handleBallPosChannelMessage);



var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var arrayofballs = [];

var ball = {
  pos: {x: 500,y: 300},    //x and y will become long and lat
  direction: { x: 0, y: 0 },
  speed: 5,
  brake: 0.9, // smaller number stop faster, max 0.99999
};


var FPS = 30;

  function animate() {
	  if (ball.pos.x > 0  && ball.pos.x < 1999 || ball.pos.x <0 && ball.direction.x >0  ||  ball.pos.x > 800 && ball.direction.x <0  ) {      // this if condition will not be needed anymore
      ball.pos.x += ball.direction.x * ball.speed;

	  }
	  if(ball.pos.y> 0  && ball.pos.y< 1999 || ball.pos.y <0 && ball.direction.y >0  ||  ball.pos.y > 1999 && ball.direction.y <0 ){         // this if condition will not be needed anymore
	  ball.pos.y += ball.direction.y * ball.speed;

	  }
    ball.direction.x *= ball.brake;
    ball.direction.y *= ball.brake;
    ballPosChannel.push({id:id, xpos:ball.pos.x, ypos:ball.pos.y});

   updateVolumes();
  }


  function updateVolumes(){
      if (arrayofvideos.length == arrayofballs.length && arrayofballs.length > 0  && arrayofvideos.length > 0){
        var i;
      for (i=0;i<arrayofballs.length;i++) {
         arrayofvideos[i].volume=1/Math.max(1, 0.05 * Math.sqrt(Math.pow((ball.pos.x - arrayofballs[i].pos.x),2) + Math.pow((ball.pos.y - arrayofballs[i].pos.y),2)));
  }
    }
  }

  // background code
  function gameBack() {
    drawRect(0,0,canvas.width,canvas.height, canvasColor);
    //draw my ball
    colorCircle(ball.pos.x,ball.pos.y,10, 'Red');
    //draw the other balls
    var i;
    for (i = 0 ; i < arrayofballs.length ; i++){
    colorCircle(arrayofballs[i].pos.x,arrayofballs[i].pos.y,10, 'Yellow');
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
        ball.direction.x += -1;
      } else if (event.keyCode === 39) { //Right
        ball.direction.x += 1;
      } else if (event.keyCode === 38) { //Up
        ball.direction.y += -1;
      } else if (event.keyCode === 40) { //Down
        ball.direction.y += 1;
      }
  });

var circles = [];
  setInterval(function() {
      if (map && mappos){
      mappos.lng += ball.direction.x * 0.15
      mappos.lat += -ball.direction.y * 0.15
      map.setCenter(mappos);

      circles.push( new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 1,
        map: map,
        center: mappos,
        radius: 10000
      })
    );


    }
      animate();
      gameBack();
    }, 1000/FPS);

    setInterval(function() {
        if (map && circles[1]){
          while(circles[1]){circles.shift().setMap(null);}
}
}, 10000/FPS);
  //-------------------------------------------------------


//Create an account on Viagenie (http://numb.viagenie.ca/), and replace {'urls': 'turn:numb.viagenie.ca','credential': '13111994','username': 'bassemsafieldeen@gmail.com'} with the information from your account
//var servers = {'iceServers': [/*{'urls': 'stun:stun.services.mozilla.com'},*/ /*{'urls': 'stun:stun.l.google.com:19302'},*/ {'urls': 'turn:numb.viagenie.ca','credential': '13111994','username': 'bassemsafieldeen@gmail.com'}]};
var servers = {'iceServers': [{'urls': 'stun:stun.services.mozilla.com'}, {'urls': 'stun:stun.l.google.com:19302'}, {'urls': 'turn:numb.viagenie.ca','credential': 'beaver','username': 'webrtc.websitebeaver@gmail.com'}]};

var arrayofvideos = [];

function initMap() {
  // Create the map.
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 8,
    center: {lat: 0.000, lng: 0.000},
    mapTypeId: 'roadmap'
  });

  if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function(position) {
    mappos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

  /*  newcirc = new google.maps.Circle({
      strokeColor: '#FF0000',
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 1,
      map: map,
      center: mappos,
      radius: 10000
    });*/

    map.setCenter(mappos);

  }, function() {});
}

}


function startnow() {

  //map.setCenter(mappos);
  navigator.mediaDevices.getUserMedia({audio:false, video:true})
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
  announceChannel.remove(function() {announceChannel.push({id : id});});
};

// Handle an incoming message on the announcement channel

var handleAnnounceChannelMessage = function(snapshot) {
  var message = snapshot.val();
  console.log("got announcement from " + message.id);
  console.log(connectedusers);
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
    console.log("in handleoffer");
    console.log(arrayofrunning);
  remote = message.sender;
  initiateWebRTCState();
  arrayofrunning[arrayofrunning.length - 1] = true;
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
  connectedusers.push(remote);
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
  if (type == 'offer'  && (arrayofchannelopen.length==0 || arrayofchannelopen[arrayofchannelopen.length - 1] == 1)) handleOfferSignal(message);
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


// Function to offer to start a WebRTC connection with a peer
var connect = function() {
  arrayofrunning[arrayofrunning.length - 1] = true;
  console.log("in connect");
  console.log(arrayofrunning);
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

  arrayofpeerconnections[arrayofpeerconnections.length - 1].onaddstream = function (event) {
    canvasColor = 'Pink';
    console.log(event.stream);
    var video = document.createElement("video");
    video.autoplay = true;
    document.body.appendChild(video);
    arrayofvideos.push(video);
    video.srcObject = event.stream;
    if (initiator!=id) connectedusers.push(remote);
    arrayofballs.push({
      pos: {x: 500,y: 300},
          direction: { x: 0, y: 0 },
      speed: 5,
          brake: 0.9, // smaller number stop faster, max 0.99999
    });
    arrayofchannelopen[arrayofchannelopen.length - 1] = 1;

    if (arrayofchannelopen.length > 1 && arrayofchannelopen[arrayofchannelopen.length - 2] == 0) {   // if a channel is open but the previous channel is not open,
      //scrape the previous one. This problem happens only with the offerer (initiator).
      console.log("removing dead channel");
      console.log(arrayofchannelopen);
      console.log(connectedusers);
      console.log(arrayofrunning);
      arrayofchannelopen.splice(arrayofchannelopen.length - 2, 1);
      arrayofpeerconnections.splice(arrayofpeerconnections.length - 2, 1);
      arrayofrunning.splice(arrayofrunning.length - 2, 1);
    }

    sendAnnounceChannelMessage();

  };

  navigator.mediaDevices.getUserMedia({audio:true, video:true})
  .then(stream => (initiator==id?arrayofpeerconnections[arrayofpeerconnections.length - 1].addStream(stream):console.log("not initiator"))    )
  .then(() => (initiator==id?connect():console.log("not initiator")));

};

var announceChannel = database.child('announce');
announceChannel.limitToLast(100).on('child_added', handleAnnounceChannelMessage);
var signalChannel = database.child('messages').child(id);
signalChannel.limitToLast(100).on('child_added', handleSignalChannelMessage);



// Send a message to the announcement channel
// If our partner is already waiting, they will send us a WebRTC offer
// over our Firebase signalling channel and we can begin delegating WebRTC
sendAnnounceChannelMessage();


}
