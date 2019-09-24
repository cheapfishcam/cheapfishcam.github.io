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
var sender;
var target;
var initiator;
var handleDataChannelOpen;
var arrayofpeerconnections = [];
//var arrayofdatachannels = [];
canvasWidth = $(window).width() - $(window).width()/15
canvasHeight = $(window).height() - $(window).height()/15
var arrayofrunning = [];
var arrayofchannelopen = [];
var arrayofvideodivs = [];   //beta
var connectedusers = [];
var OtherBallsColor = 'Yellow';
var broadcasting = 0;  //if this is 1, the user's video is turned on on the other users' screens. When it becomes 0 again, the video turns off. This variable is sent to the other users in animate().
var myStream;
var arrayofstreams = [];
var arrayofballs = [];
var arrayofLcircles = [];

// Generate this browser a unique ID
// On Firebase peers use this unique ID to address messages to each other
// after they have found each other in the announcement channel
var id = Math.random().toString().replace('.', '');
var remote;          // ID of the remote peer -- set once they send an offer
//--------------------------------------------------------

//Opens video on pressing spacebar
document.addEventListener('keydown',function(e){
  if (e.keyCode==32) {
    broadcasting = 1;
    yourVideo.width = canvasWidth/10;
    yourVideo.height = yourVideo.width;
    if (myStream != undefined && yourVideo.srcObject == null){yourVideo.srcObject = myStream;}
  }
});

document.addEventListener('keyup', function(e){
  if (e.keyCode==32) {
    broadcasting = 0;
    yourVideo.width = 0;
    yourVideo.height = 0;
    yourVideo.src="";
  }
});

var handleBallPosChannelMessage = function (message) {
   var theSender = message.val().id;
   if(theSender != id && connectedusers != undefined  && connectedusers.length > 0 && arrayofballs.length == connectedusers.length) {
   var PosInArray = connectedusers.indexOf(theSender);
   if (PosInArray != -1){
   arrayofballs[PosInArray].pos.lat = message.val().xpos;
   arrayofballs[PosInArray].pos.lng = message.val().ypos;
   arrayofballs[PosInArray].broadcasting = message.val().broadcasting;
 }
}
};

var ballPosChannel = database.child('positions');
ballPosChannel.limitToLast(30).on('child_added', handleBallPosChannelMessage);




    var ball = {
       pos: {lat: 0,lng: 0},
       direction: { x: 0, y: 0 },
       speed: 0.005,
       brake: 0.9, // smaller number stop faster, max 0.99999
       broadcasting: 0,
               };

    var map = L.map('map');
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
			'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		id: 'mapbox.streets'
	}).addTo(map);

    
    var current_position;
    var myBall;
    function onLocationFound(e) {
      ball.pos.lat = e.latlng.lat;
      ball.pos.lng = e.latlng.lng;
      myBall = L.circle([ball.pos.lat, ball.pos.lng], {radius: 200, color: "red", fillOpacity: 1.0}).addTo(map);
      //myBall.bindPopup('hello').openPopup();
                                 }

    map.on('locationfound', onLocationFound);
    map.locate({setView: true, maxZoom: 16});

    document.addEventListener('keydown', event => {
      if (event.keyCode === 37) { //Left
        ball.direction.x += -1;
      } else if (event.keyCode === 39) { //Right
        ball.direction.x += 1;
      } else if (event.keyCode === 38) { //Up
        ball.direction.y += 1;
      } else if (event.keyCode === 40) { //Down
        ball.direction.y += -1;
      }
  });




  function updateVolumes(){
      if (arrayofvideos.length == arrayofballs.length && arrayofballs.length > 0  && arrayofvideos.length > 0){
        var i;
      for (i=0;i<arrayofballs.length;i++) {
         arrayofvideos[i].volume=1/Math.max(1, 0.05 * Math.sqrt(Math.pow((ball.pos.lat - arrayofballs[i].pos.lat),2) + Math.pow((ball.pos.lng - arrayofballs[i].pos.lng),2)));
  }
    }
  }



     function animate() {
          ball.pos.lng += ball.direction.x * ball.speed;
	  ball.pos.lat += ball.direction.y * ball.speed;
	  ball.direction.x *= ball.brake;
          ball.direction.y *= ball.brake;
          ballPosChannel.push({id:id, xpos:ball.pos.lat, ypos:ball.pos.lng, broadcasting:broadcasting});
          updateVolumes();
                        }

     function gameBack() {
          //if (myBall){map.removeLayer(myBall);}
          //myBall = L.circle([ball.pos.lat, ball.pos.lng], {radius: 200, color: "red", fillOpacity: 1.0}).addTo(map);
          myBall.setLatLng([ball.pos.lat, ball.pos.lng]);
          map.setView(new L.LatLng(ball.pos.lat, ball.pos.lng), 8);
         //Move video to be on top of ball
         $("#videoDiv").css({"position": "absolute", "top": canvasHeight/1.5 , "left": yourVideo.width/2, "width":yourVideo.width, "height":yourVideo.height});
         //draw the other balls
         var i;
         for (i = 0 ; i < arrayofballs.length ; i++){
         //L.circle([arrayofballs[i].pos.lat, arrayofballs[i].pos.lng], {radius: 200, color: "red", fillOpacity: 1.0}).addTo(map);
         arrayofLcircles[i].setLatLng([arrayofballs[i].pos.lat, arrayofballs[i].pos.lng]);
        //move video of other balls to be on top of respective balls
         $("#videoDiv"+i).css({ "position": "absolute", "top": 10 + canvasHeight/50 + arrayofvideos[i].height/10, "left": 10-arrayofvideos[i].width/2 }); //beta
        //turn on video for broadcasting balls
        if (arrayofballs[i].broadcasting == 1 && arrayofvideos[i].srcObject == null) {
           arrayofvideos[i].srcObject = arrayofstreams[i];
           arrayofvideos[i].width =  yourVideo.width/Math.max(1, 0.05 * Math.sqrt(Math.pow((ball.pos.lat - arrayofballs[i].pos.lat),2) + Math.pow((ball.pos.lng - arrayofballs[i].pos.lng),2)));
           arrayofvideos[i].height = yourVideo.height/Math.max(1, 0.05 * Math.sqrt(Math.pow((ball.pos.lat - arrayofballs[i].pos.lat),2) + Math.pow((ball.pos.lng - arrayofballs[i].pos.lng),2)));
           arrayofLcircles[i].bindPopup('<video id="testvid" width="420" height="315" autoplay></video>').openPopup();
           var thetestvid = document.getElementById("testvid");
           thetestvid.srcObject = arrayofstreams[i];
                                                                                     } 
        else if(arrayofballs[i].broadcasting == 0) {
           arrayofLcircles[i].closePopup();
           if(thetestvid){thetestvid.src="";}
           arrayofvideos[i].src = "";
           arrayofvideos[i].width = 0;
           arrayofvideos[i].height = 0;
                                                   }
        else {
           if(arrayofLcircles[i].getPopup().isOpen() == false){arrayofLcircles[i].openPopup();}
           arrayofvideos[i].width =  yourVideo.width/Math.max(1, 0.05 * Math.sqrt(Math.pow((ball.pos.lat - arrayofballs[i].pos.lat),2) + Math.pow((ball.pos.lng - arrayofballs[i].pos.lng),2)));
           arrayofvideos[i].height = yourVideo.height/Math.max(1, 0.05 * Math.sqrt(Math.pow((ball.pos.lat - arrayofballs[i].pos.lat),2) + Math.pow((ball.pos.lng - arrayofballs[i].pos.lng),2)));   
             }
                         }
                                                     }


     var FPS = 30;
     setInterval(function() {
          animate();
          gameBack();
        //remove dead balls
          var i;
          for (i=0;i<arrayofpeerconnections.length;i++) {
             if (arrayofpeerconnections[i].iceConnectionState === 'disconnected'){
                if(arrayofpeerconnections.length == arrayofballs.length && arrayofballs.length == arrayofLcircles.length && arrayofLcircles.length == arrayofrunning.length && arrayofrunning.length == arrayofchannelopen.length && arrayofchannelopen.length == arrayofvideos.length && arrayofvideos.length == arrayofvideodivs.length && arrayofvideodivs.length == arrayofstreams.length && arrayofstreams.length == connectedusers.length){
                arrayofpeerconnections.splice(i,1); 
                arrayofballs.splice(i,1);
                map.removeLayer(arrayofLcircles[i]);
                arrayofLcircles.splice(i,1);
                arrayofrunning.splice(i,1);
                arrayofchannelopen.splice(i,1);
                arrayofvideos.splice(i,1);
                arrayofvideodivs.splice(i,1);
                arrayofstreams.splice(i,1);
                connectedusers.splice(i,1);
                var deadvideodiv = document.getElementById("videoDiv" + i);
                document.body.removeChild(deadvideodiv);
                i--;
                      }
                                                                                 } 
                                                        }
    }, 1000/FPS);


//-----------------------------------------------------



var servers = {'iceServers': [{'urls': 'stun:stun.services.mozilla.com'}, {'urls': 'stun:stun.l.google.com:19302'}, {'urls': 'turn:numb.viagenie.ca','credential': '13111994','username': 'bassemsafieldeen@gmail.com'}]};

var arrayofvideos = [];


function startnow() {


  navigator.mediaDevices.getUserMedia({audio:true, video:true})
    .then(stream => myStream = stream);


// Announce our arrival to the announcement channel
var sendAnnounceChannelMessage = function() {
  announceChannel.remove(function() {announceChannel.push({id : id});});
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

// Send a message to the remote client via Firebase
var sendSignalChannelMessage = function(message) {
  message.sender = id;
  database.child('messages').child(remote).push(message);
};

// Handle a WebRTC offer request from a remote client
var handleOfferSignal = function(message) {
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


var handleSignalChannelMessage = function(snapshot) {
  var message = snapshot.val();
  var sender = message.sender;
  var type = message.type;
  if (type == 'offer'  && (arrayofchannelopen.length==0 || arrayofchannelopen[arrayofchannelopen.length - 1] == 1)) handleOfferSignal(message);
  else if (type == 'answer') handleAnswerSignal(message);
  else if (type == 'candidate' && arrayofrunning[arrayofrunning.length - 1]) handleCandidateSignal(message);
};


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
    var newDivWrapper = document.createElement('div');  //create new Div----
    newDivWrapper.id = 'videoDiv' + arrayofvideodivs.length;
    newDivWrapper.style = "z-index: 100";
    console.log(newDivWrapper.id);
    var video = document.createElement('video');
    video.autoplay = true;
    newDivWrapper.appendChild(video);
    arrayofvideodivs.push(newDivWrapper);       //----
    document.body.appendChild(newDivWrapper);   //change this back to video
    arrayofvideos.push(video);     
    arrayofstreams.push(event.stream);
    if (initiator!=id) connectedusers.push(remote);
    arrayofballs.push({
      pos: {lat: 0,lng: 0},
      direction: { x: 0, y: 0 },
      speed: 0.005,
      brake: 0.9, // smaller number stop faster, max 0.99999
      broadcasting: 0,
    });
    arrayofLcircles.push(L.circle([0, 0], {radius: 200, color: "red", fillOpacity: 1.0}).addTo(map));
    //arrayofLcircles[arrayofLcircles.length-1].bindPopup('<video id="video"+initiator width="420" height="315" autoplay></video>')
    arrayofchannelopen[arrayofchannelopen.length - 1] = 1;

    if (arrayofchannelopen.length > 1 && arrayofchannelopen[arrayofchannelopen.length - 2] == 0) { 
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
announceChannel.limitToLast(30).on('child_added', handleAnnounceChannelMessage);
var signalChannel = database.child('messages').child(id);
signalChannel.limitToLast(30).on('child_added', handleSignalChannelMessage);



sendAnnounceChannelMessage();

}