
let lastTime = 0;
let theIP = '192.168.2.121';

let teamCheckInterval = 500;
let myheckInterval = 3;

let myID = 44150;

let awsKey = 'XXX';
let awsSecret = 'YYY';

let eventDistance = 16;

//upload to S3 ?
let upload = true;
let showSplits = false;
let event = true;
let eventName = 'Tour for All 2020: Stage 3';

const ZwiftPacketMonitor = require('@zwfthcks/zwift-packet-monitor');


// interface is cap interface name (can be device name or IP address)
const monitor = new ZwiftPacketMonitor(theIP);


function shallTest(seconds){

    if ( Math.floor((new Date() - lastTime)/1000) > seconds ) {
        // get from variable
        console.log('check: '+ seconds);
        lastTime =  new Date();
        return true;
    }

    return false;
}




//the splits
/*
 out and Back
 */

let teamIds = [461812,813045,44150,97267,616981,61535,237319,273043,63664,268899,237319,817932,1696776,642285,902466,170027];


let teamData = new Map();


let splits = new Map();
splits.set(2.0, "0:00:00");
splits.set(5.0, "0:00:00");
splits.set(8.0, "0:00:00");
splits.set(14.0, "0:00:00");
splits.set(20.0, "0:00:00");
splits.set(22.0, "0:00:00");
splits.set(28.0, "0:00:00");
splits.set(32.0, "0:00:00");
splits.set(34.0, "0:00:00");
splits.set(38.0, "0:00:00");


monitor.on('outgoingPlayerState', (playerState, serverWorldTime) => {
    //console.log("outgoingPlayerState");
   // console.log("outgoingPlayerState");
    if(shallTest(myheckInterval)){
        processOutgoing(playerState);
    }

});

monitor.on('incomingPlayerState', (playerState, serverWorldTime) => {
    if(shallTest(teamCheckInterval)){
        processIncoming(playerState);
    }


});

// The Zwift server sends states in batches. This event is emitted at the end of each incoming batch
monitor.on('endOfBatch', () => {
    //console.log('....');
});

monitor.start();


function sec2time(timeInSeconds) {
    var pad = function (num, size) {
            return ('000' + num).slice(size * -1);
        },
        time = parseFloat(timeInSeconds).toFixed(3),
        hours = Math.floor(time / 60 / 60),
        minutes = Math.floor(time / 60) % 60,
        seconds = Math.floor(time - minutes * 60);


    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(seconds, 2);
}

function getDistance(d) {


    var km = d / 1000;

    //show m when under 1 km
    if (d < 1000) {
        return d.toFixed(1) + "m";
    }

    return km.toFixed(1) + " km"

}

function getsplits(t, d) {

    let dd = d / 1000;

    for (let [key] of splits) {
        //  console.log ( 'split: '+ key.toFixed(1) +' distance : '+dd.toFixed(1));
        if (key.toFixed(1) == dd.toFixed(1)) {
            let sp = sec2time(t);
             //console.log('adding split: '+ key+ ' : '+ sp);
            splits.set(key, sp);
        }
    }
    return splits;

}



function checkForTeamMember(id,data) {
    if(teamIds.includes(id)){
        teamData.set(id,data);
    }

}

function generateSplitHTML(map) {

    let html = '';
    for (let [key, value] of map) {
        html += '<tr><td>';
        html += key + ' km : ' + value + 'min';
        html += '</td><tr>'
    }

    return html;
}


function generateTeamHTML(map) {


    let html = '';

    for (let [key, value] of map) {

        html+='  <p  class="rcorners2">';
        html+= '<img src="power.png" width="30"><b> <span >'+value.power +' </span> w </b><br>';
        html+= '<img src="hr.png" width="30"><b>  <span > '+value.heartrate +'</span> bpm</b><br>';
        html+= ' </p>';
    }

    return html;
}


function processIncoming(playerState) {

    console.log("incomingPlayerState");
    var handlebars = require('handlebars'),
    fs = require('fs');

    var riderData = {
        power: playerState.power,
        heartrate: playerState.heartrate,
    };


    //adds teammembers if in the list
    checkForTeamMember(playerState.id,riderData);


    //create team stats
    fs.readFile('custom_stats.html', 'utf-8', function (error, teamSource) {

        var teamDataTable = {
            teamDataTable: generateTeamHTML(teamData)
        };

        var template = handlebars.compile(teamSource);
        var teamthtml = template(teamDataTable);

        fs.writeFile('team_stats.html', teamthtml, (error) => {
        });
    });

    if(upload){
        uploadS3('team_stats.html');
    }
}


function getEventDistance(d){

    var km = d / 1000;
    var remaining = eventDistance - km ;
    return remaining.toFixed(1);

}

function writeFiles(data,distance) {

    var handlebars = require('handlebars'),
        fs = require('fs');

    if(event) {

        fs.readFile('custom_event.html', 'utf-8', function (error, source) {

            var eventData = {
                name: eventName,
                distance: getEventDistance(distance)
            };

            var template = handlebars.compile(source);
            var eventHtml = template(eventData);
            fs.writeFile('my_event.html', eventHtml, (error) => { /* handle error */
            });
        });

        if(upload){
            uploadS3('my_event.html');
        }
    }

    fs.readFile('custom_hud.html', 'utf-8', function (error, source) {
        var template = handlebars.compile(source);
        var html = template(data);
        fs.writeFile('my_hud.html', html, (error) => { /* handle error */
        });
    });

    fs.readFile('custom_roadtime.html', 'utf-8', function (error, source) {
        var template = handlebars.compile(source);
        var html = template(data);
        fs.writeFile('my_roadtime.html', html, (error) => { /* handle error */
        });
    });

    if(upload){
        uploadS3('my_hud.html');
        uploadS3('my_roadtime.html');
    }

    if(showSplits) {
        fs.readFile('custom_splits.html', 'utf-8', function (error, splitSource) {

            var splitData = {
                splitTable: generateSplitHTML(getsplits(playerState.time, playerState.distance))
            };

            var template = handlebars.compile(splitSource);
            var splithtml = template(splitData);

            fs.writeFile('my_splits.html', splithtml, (error) => {
            });
        });

        if (upload) {
            uploadS3('my_splits.html');
        }


}



function uploadS3(filename){

     console.log("uploadS3: "+ filename);
    const fs = require('fs');
    const AWS = require('aws-sdk');

    const s3 = new AWS.S3({
        accessKeyId: awsKey,
        secretAccessKey: awsSecret
    });

    let fileContent = fs.readFileSync(filename);

    const params = {
        Bucket: "wtrl-ttt",
        Key: filename, // File name you want to save as in S3
        Body: fileContent,
        ContentType: 'text/html',
        ACL:'public-read'
    };



    // Uploading files to the bucket
    s3.upload(params, function(err, data) {
        if (err) {
            console.log(err);
           // throw err;
        }
        console.log(`File uploaded successfully. ${data.Location}`);
    });

}}


function processOutgoing(playerState) {
// console.log(playerState);
//console.log(myID);
    //MY DATA :)
    if (playerState.id === myID) {

        //44150 Stephan Leuendorff
        // anja 170027
        //Sören 1111823

        //console.log(playerState)
        /*console.log('ID: '+ playerState.id)
        console.log('power: ' + playerState.power);
        console.log('heartrate: ' + playerState.heartrate);
        console.log('distance: ' + playerState.distance);
        console.log('roadTime: ' + playerState.roadTime);
        */

        var data = {
            power: playerState.power,
            heartrate: playerState.heartrate,
            distance: getDistance(playerState.distance),
            cadence: playerState.cadenceUHz,
            time: sec2time(playerState.time)
        };

        writeFiles(data,playerState.distance);
    }
}
