const ZwiftPacketMonitor = require('@zwfthcks/zwift-packet-monitor');



// interface is cap interface name (can be device name or IP address)
const monitor = new ZwiftPacketMonitor('192.168.2.121');



//the splits
/*
 out and Back
 */

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
    process(playerState)
});

monitor.on('incomingPlayerState', (playerState, serverWorldTime) => {
   // console.log("incomingPlayerState");
   // process(playerState)

});

// The Zwift server sends states in batches. This event is emitted at the end of each incoming batch
monitor.on('endOfBatch', () => {
   //console.log('.')
});

monitor.start();



function sec2time(timeInSeconds) {
    var pad = function(num, size) { return ('000' + num).slice(size * -1); },
        time = parseFloat(timeInSeconds).toFixed(3),
        hours = Math.floor(time / 60 / 60),
        minutes = Math.floor(time / 60) % 60,
        seconds = Math.floor(time - minutes * 60);


    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(seconds, 2);
}

function getDistance(d) {

    var dist = 0;
    var km = d/ 1000;

    //show m when under 1 km
    if(d < 1000){
        return d.toFixed(1) + "m";
    }

    return km.toFixed(1) + " km"

}

function getsplits(t,d) {

    let dd = d/1000;

    for (let [key] of splits) {
      //  console.log ( 'split: '+ key.toFixed(1) +' distance : '+dd.toFixed(1));
       if(key.toFixed(1)  == dd.toFixed(1 )){
            let sp = sec2time(t)
           // console.log('adding split: '+ key+ ' : '+ sp);
            splits.set(key,sp);
        }
    }
    return splits;

}


function generateSplitHTML(map){
    let html = '';

    for (let [key,value] of map) {
        html += '<tr><td>';
        html += key + ' km : ' +value+ 'min';
        html += '</td><tr>'
    }

    return html;
}


function process(playerState) {

   // console.log('process')
    if (playerState.id == 44150) {

        //console.log(playerState);
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
                time: sec2time(playerState.time)
            };




            var handlebars = require('handlebars'),
                fs = require('fs');

            fs.readFile('custom_hud.html', 'utf-8', function (error, source) {

                var template = handlebars.compile(source);
                var html = template(data);
                fs.writeFile('my_hud.html', html, (error) => { /* handle error */
                });
            });


        fs.readFile('custom_splits.html', 'utf-8', function (error, splitSource) {

            var splitData = {
               splitTable: generateSplitHTML(   getsplits(playerState.time,playerState.distance))
            };

            var template = handlebars.compile(splitSource);
            var splithtml = template(splitData);

            fs.writeFile('my_splits.html', splithtml, (error) => {
            });
        });

        }


}
