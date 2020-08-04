/* Copyright Notice
 ********************************************************************************
 * Copyright (C) Ryan Magilton - All Rights Reserved                            *
 * Unauthorized copying of this file, via any medium is strictly prohibited     *
 * without explicit permission                                                  *
 * Written by Ryan Magilton <ramagilton18@hotmail.net>, July 2019               *
 ********************************************************************************/

const Discord = require('discord.js');
const bot = new Discord.Client();
const fs = require('fs');
const request = require('request');
const List = require('collections/list');
const Map = require('collections/map');
const { token, botid, dadid } = require('./config.json');
const alphabet = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

// The time until the bot leaves a voice chat
const voiceTimeout = 300000;

// Set up lists for built-in audio packs
var lines;
var linedata;
var linetimes;

// Initialize built-in audio packs
fs.readFile('lines', 'utf8', (err, data) => {
    if (err) throw err;

    fs.writeFile('linedata', '', (err) => {
        if (err) console.log(err);
        //console.log("Successfully Written empty to File.");
    });
    
    writedata = '';

    //console.log(data);
    lines = new Array();
    lines = data.split('\n');
    lines.forEach(line => {
        line = line.toLowerCase();
        alphabet.forEach(letter => {
            let count = 0;
            for (i = 0; i < line.length; i++) {
                if (line.substring(i,i+1) == letter) {
                    count++;
                }
            }
            writedata += count + ' ';
        });
        writedata += '\n';
    });

    fs.writeFile('linedata', writedata.substring(0, writedata.length - 2), (err) => {
        if (err) console.log(err);
        //console.log("Successfully Written writedata to File.");
    });

    fs.readFile('linedata', 'utf8', (err, lined) => {
        if (err) throw err;
        linedata = lined.split('\n'); 
    });
});
fs.readFile('linetime', 'utf8', (err, data) => {
    if (err) throw err;

    linetimes = data.split('\n');
});

// List of active text channels
var activeTC = new List();
// Dictionary of text channel and string, remembers last song line played
var recentLine = new Map();
// Dictionary of text channel and timeout, keeps track of time spent in voice channles
var disableTC = new Map();

// Log the bot it
bot.login(token); // https://discordapp.com/oauth2/authorize?client_id=613910856111226904&scope=bot&permissions=8

// Sets up guild audio packs on bot start
bot.on('ready', () => {
    console.log('This bot is online!');
    bot.user.setPresence({ game: { name: 't2s:help' }, status: 'online' });
    bot.guilds.forEach(guild => {
        if (guild.channels.find('name', 'audio-packs') && guild.channels.find('name', 'audio-packs').type == 'text') {
            guild.channels.find('name', 'audio-packs').fetchMessages();
        }
    })
});

// Handling messages
bot.on('message', msg => {
    // debug function
    if (msg.channel.type != 'text') {
        if (msg.channel.type == 'dm' && msg.author.id == dadid) {
            if (msg.content === '!leave-all') {
            activeTC.forEach(channel => {
                bot.voiceConnections.forEach(conn => {
                    if (conn.channel.guild == channel.guild) {
                        conn.disconnect();
                    }
                });
                channel.send('I have left channels globally!');
                activeTC.delete(channel);
                clearTimeout(disableTC.get(channel));
                disableTC.delete(channel);
            });
            bot.voiceConnections.forEach(conn => {
                conn.disconnect();
            });
            }
            if (msg.content === '!guilds') {
                bot.guilds.forEach(g => {
                    msg.channel.send(g.name + " - <@" + g.ownerID + ">");
                });
            }
        }
        return;
    }

    // debug function
    if (msg.member.id == dadid && msg.content === '!react') {
        msg.react('❌');
        msg.react('✅');
    }

    // Handles commands
    if (msg.content.toLowerCase().startsWith('t2s:') && msg.member.hasPermission('ADMINISTRATOR')) {
        switch (msg.content.toLowerCase()) {
            case 't2s:help':
                msg.channel.send({
                    embed: {
                        title: "Commands",
                        description: "**t2s:help** do I really need to explain?\n**t2s:start** to move me to a voice channel\n**t2s:intro** specify a pack to play the intro for\n**t2s:stop** to move me out\n**t2s:list** to get a list of songs that I can read lines from\n**t2s:library** get a list of published audio packs that you can add\n**t2s:import** add songs using my Text2Sing Interface tool\n**t2s:add** Adds an audio pack for me to read from\n**t2s:tool** Displays a link to my tool!",
                        color: 16753920
                    }
                });
                //'```\nt2s:start to start a challenge\nt2s:stop to end it\nt2s:list to get a list of songs that I can read lines from```'
                break;
            case 't2s:start':
                if (activeTC.has(msg.channel)) {
                    msg.reply('I am already watching this text channel! t2s:stop to end it.');
                    break;
                }
                if (msg.member.voiceChannel && msg.member.guild == msg.guild) {
                    msg.member.voiceChannel.join().then( () => {
                        disableTC.set(msg.channel, setTimeout(() => {
                            msg.member.voiceChannel.leave();
                            activeTC.delete(msg.channel);
                            msg.channel.send('I am no longer active in this text channel due to lack of activity.');
                            disableTC.delete(msg.channel);
                        }, voiceTimeout));
                    });
                    msg.channel.send('The Text2Sing bot is active in the ' + msg.member.voiceChannel.name + ' voice channel!');
                    activeTC.add(msg.channel);
                } else {
                    msg.reply('You must be in a voice channel!');
                }
                break;
            case 't2s:stop':
                if (!activeTC.has(msg.channel)) {
                    msg.reply('I was never watching this text channel!');
                    break;
                }
                bot.voiceConnections.forEach(conn => {
                    if (conn.channel.guild == msg.guild) {
                        conn.disconnect();
                    }
                });
                msg.channel.send('I am no longer active in this text channel!');
                activeTC.delete(msg.channel);
                clearTimeout(disableTC.get(msg.channel));
                disableTC.delete(msg.channel);
                break;
            case 't2s:list': 
                //msg.channel.send('```Default:\nRevenge\nAll Star\nNever Gonna Give You Up```');
                sendList(msg);
                break;
            case 't2s:tool':
                msg.channel.send('This link takes you to a tool to add your own songs to my database: https://ryfi.itch.io/text2sing-interface');
                break;
            case 't2s:library':
                loadLibrary(0, msg);
                break;
        }
        if (msg.content.toLowerCase().startsWith('t2s:import')) {
            var args = msg.content.split(' ');
            if (args.length != 4) {
                msg.reply('t2s:import <song-name> <line-description> <link/fileID>');
                msg.reply('(Ex)t2s:import Revenge short https://drive.google.com/uc?export=download&id=');
            } else {
                args[0] = args[0].toLowerCase();
                args[1] = args[1].toLowerCase();
                args[2] = args[2].toLowerCase();

                if (!args[3].startsWith('https://drive.google.com/uc?export=download&id=') && (args[3].startsWith('http') || args[3].includes('.com'))) {
                    msg.reply('The link must start with https://drive.google.com/uc?export=download&id= in order to get this you can copy the file ID drive.google.com/file/d/**FILE_ID**/edit?usp=sharing and paste it at the end OR just paste the file ID and the link will be added automatically');
                } else {
                if (!args[3].startsWith('http')) {
                    args[3] = 'https://drive.google.com/uc?export=download&id=' + args[3];
                }
                var p2data = '';
                fs.readFile('imported', 'utf8', (err, data) => {
                    if (err) throw err;
                    p2data = data;
                    let sdata = p2data.split('\n');
                for (i = 0; i < sdata.length; i++) {
                    if (sdata[i] == 'Title: ' + args[1]) {
                        msg.reply('This song exists already! Try a different name.');
                        return;
                    }
                }
                    try {
                        var importData = '';
                        var showData = '';
                        importData += '\nTitle: ' + args[1];
                        showData += 'Title: ' + args[1];
                        importData += '\nLine Desc: ' + args[2];
                        showData += '\nLine Desc: ' + args[2];
                        importData += '\nUser: ' + msg.member.user.id;
                        showData += '\nUser: ' + msg.member.user.username + '#' + msg.member.user.discriminator;
                        importData += '\nLink: ' + args[3];
                        showData += '\nLink: ' + args[3];
                        showData += '\nUse t2s:add to add this audio pack!';
                        msg.channel.send('```' + showData + '```');
                    
                        var pdata = '';
                        fs.readFile('imported', 'utf8', (err, data) => {
                            if (err) throw err;
                            pdata = data;

                            fs.writeFile('imported', pdata + importData, (err) => {
                                if (err) console.log(err);
                                //console.log("Successfully Written empty to File.");
                            });
                        });

                    } catch (e) {
                        msg.reply('There was an issue handling that request...');
                    }
                });
                
                }
            }
        }
        if (msg.content.toLowerCase().startsWith('t2s:add')) {
            var fdata = '';
            var flink = '';
            if (msg.content.split(' ').length != 2) {
                msg.reply('t2s:add <song-title>');
                return;
            }
                var pdata = '';
                fs.readFile('imported', 'utf8', (err, data) => {
                    if (err) throw err;
                    pdata = data;
                    let sdata = pdata.split('\n');
                for (i = 0; i < sdata.length; i++) {
                    //console.log(sdata[i]);
                    //console.log('Title: ' + msg.content.split(' ')[1].toLowerCase());
                    if (sdata[i] == 'Title: ' + msg.content.split(' ')[1].toLowerCase()) {
                        fdata = sdata[i] + '\n' + sdata[i+1] + '\n' + sdata[i+2] + '\n' + sdata[i+3] + '\n';
                        flink = sdata[i+3];
                    }
                }
            if (fdata == '') {
                msg.reply('No song under this name exists');
                return;
            }
            if (!msg.guild.channels.find('name', 'audio-packs') || msg.guild.channels.find('name', 'audio-packs').type != 'text') {
                msg.guild.createChannel('audio-packs', {
                    type: 'text',
                    topic: 'This is a list of added audio packs. T2S:add to add packs, Delete my messages to remove packs',
                    permissionOverwrites: [{
                      id: msg.guild.id,
                      deny: ['READ_MESSAGES']
                    }]
                  }).then(chan => {
                    chan.send('```Default Pack (Revenge, All Star, Rick Roll)```').then(m => {
                        m.react('❌');
                    });
                    addPack(msg, fdata, flink);
                        /*let uid = fdata.substring(fdata.indexOf('User: ') + 6, fdata.indexOf('\n', fdata.indexOf('User: ') + 6));
                        bot.fetchUser(uid).then(ubi => {
                            //fdata = fdata.replace(uid, ubi.username + '#' + ubi.discriminator);
                            chan.send('```Default Pack (Revenge, All Star, Rick Roll)```').then(m => {
                                m.react('❌');
                            });
                            //chan.send('```Default Pack is Enabled, react to disable```').then(m => {
                            //    m.react('❌');
                            //});
                            addPack(msg, fdata, flink);
                        }); */
                  });
            } else {
                addPack(msg, fdata, flink);
            }
        });
        }
        if (msg.content.toLowerCase().startsWith('t2s:intro')) {
            if (msg.content.split(' ').length != 2) {
                msg.reply('t2s:intro <song-title>');
                return;
            }
            let sname = msg.content.toLocaleLowerCase().split(' ')[1];
            if (sname == 'revenge') {
                bot.voiceConnections.forEach(conn => {
                    if (conn.channel.guild == msg.guild) {
                        let stdis = conn.playFile('/Users/ryanmagilton/Desktop/Random/Aww Man Bot/Audio/' + 'Revenge' + '.mp3');
                        stdis.on('start', () => {
                            conn.player.streamingData.pausedTime = 0;
                            setTimeout(() => {
                                stdis.end();
                         }, ((4.44) * 1000));
                       }); 
                    }
                });
                return;
            }
            if (sname == 'allstar') {
                bot.voiceConnections.forEach(conn => {
                    if (conn.channel.guild == msg.guild) {
                        let stdis = conn.playFile('/Users/ryanmagilton/Desktop/Random/Aww Man Bot/Audio/' + 'AllStar' + '.mp3');
                        stdis.on('start', () => {
                            conn.player.streamingData.pausedTime = 0;
                            setTimeout(() => {
                                stdis.end();
                         }, ((37.25) * 1000));
                       }); 
                    }
                });
                return;
            }
            if (sname == 'rickroll') {
                bot.voiceConnections.forEach(conn => {
                    if (conn.channel.guild == msg.guild) {
                        let stdis = conn.playFile('/Users/ryanmagilton/Desktop/Random/Aww Man Bot/Audio/' + 'RickRoll' + '.mp3');
                        stdis.on('start', () => {
                            conn.player.streamingData.pausedTime = 0;
                            setTimeout(() => {
                                stdis.end();
                         }, ((18.47) * 1000));
                       }); 
                    }
                });
                return;
            }
            let apacks = msg.guild.channels.find('name', 'audio-packs');
    if (!apacks || apacks.type != 'text') {
        return;
    }
            apacks.fetchMessages().then(msgs => {
                let link = '';
                let af = '';
                msgs.forEach(m => {
                    if (m.member.id == bot.user.id && m.content.startsWith('```Title: ')) {
                        if (m.content.substring(10, m.content.indexOf('\n')) == sname) {
                            link = m.content.substring(m.content.indexOf('Link: ') + 6, m.content.indexOf('\n', m.content.indexOf('Link: ')));
                        }
                    }
                    if (m.member.id == bot.user.id && m.attachments.first()) {
                        if(m.attachments.first().filename == sname + '.mp3') {
                            af = m.attachments.first().url;
                        }
                    }
                });
                if (link && af) {
                    request.get(link, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            let sbody = body.split('\n');
                            let etime = 0; 
                            for (i = 0; i < sbody.length; i++) {
                                if (sbody[i] == 'Linetimes:') {
                                    try {
                                        etime = Number(sbody[i+1].split(' ')[0]);
                                    } catch (e) {
                                        etime = 0;
                                    }
                                }
                            }

                            if (etime <= 0) {
                                msg.reply('This song has no intro!');
                            } else {
                                bot.voiceConnections.forEach(conn => {
                                    if (conn.channel.guild == msg.guild) {
                                let stdis = conn.playStream(af);
                            stdis.on('start', () => {
                                conn.player.streamingData.pausedTime = 0;
                                setTimeout(() => {
                                    stdis.end();
                                }, ((etime) * 1000));
                            }); 
                            }
                        });
                    }
                        } else {
                            msg.channel.send('Error reading **' + sname + '** audio pack file. It is not formatted correctly.');
                            return;
                        }
                    });
                } else {
                    msg.reply('Could not find an added pack with that title!');
                }
            });
        }
        if (msg.content.toLowerCase().startsWith('t2s:karaoke')) {
            if (msg.content.split(' ').length != 2) {
                msg.reply('t2s:karaoke <song-title>');
                return;
            } else {
                testForPack(msg.content.split(' ').toLowerCase[1], msg)
            }
        }

    } 
    // Handles lyrics
    else 
    {
        if (msg.member.id != '613910856111226904' && activeTC.has(msg.channel)) {
            let line = msg.content;
            let data = ''
            //console.log(line);
            let mult = '';
            if (line.includes('+')) {
                let adt = line.substring(line.indexOf('+') + 1);
                if (Number(adt)) {
                    mult = Number(adt);
                    line = line.replace('+' + adt, '');
                    mult = '+' + mult;
                }
            }
            line = line.replace(/1/g, 'l');
            line = line.replace(/3/g, 'e');
            line = line.replace(/4/g, 'a');
            line = line.replace(/5/g, 's');
            line = line.replace(/7/g, 't');
            line = line.replace(/0/g, 'o');
            line = line.toLowerCase();
            line = line + mult;
            //console.log(line);

            alphabet.forEach(letter => {
                let count = 0;
                for (i = 0; i < line.length; i++) {
                    if (line.substring(i,i+1) == letter) {
                        count++;
                    }
                }
                data += count + ' ';
            });

            var defaultOn = false;
            var addedPackNames = new List();
            var addedPacks = new List();
            var audioFiles = new List();
            if (msg.guild.channels.find('name', 'audio-packs') && msg.guild.channels.find('name', 'audio-packs').type == 'text') {
                msg.guild.channels.find('name', 'audio-packs').fetchMessages().then(msgss => {
                    var msgs = msgss.array();
                    for(i = 0; i < msgs.length; i++) {
                        var m = msgs[i];
                        if (m.member.id == bot.user.id) {
                            let sm = m.content.split('\n');
                            sm.forEach(ssm => {
                                if (ssm.startsWith('```Title:') && m.content.includes('Enabled')) {
                                    addedPackNames.add(ssm.substring(10));
                                    //console.log(ssm.substring(10));
                                    audioFiles.add(msgs[i-1]);
                                }
                                if (ssm.startsWith('Link:') && m.content.includes('Enabled')) {
                                    addedPacks.add(ssm.substring(6));
                                    //console.log(ssm.substring(6));
                                }
                                if (ssm.includes('Default Pack') && !ssm.includes('DISABLED')) {
                                    defaultOn = true;
                                }
                            });
                        }
                    }
                    
                    loadImportData(msg, addedPacks.toArray(), addedPackNames.toArray(), audioFiles.toArray(), line, data, defaultOn);
                    return;
                });
            } else {
            //console.log('legacy');
            var lcs = data.substring(0, data.length - 1).split(' ');
            var lineScores = new Array(linedata.length);
            for (i = 0; i < linedata.length; i++) {
                let rlcs = linedata[i].split(' ');
                lineScores[i] = 0;
                for (j = 0; j < rlcs.length - 1; j++) {
                    lineScores[i] += Math.abs(Number(lcs[j]) - Number(rlcs[j]));
                }
                var recentInd = 0;
                for (j = 0; j < lines[i].length - 1; j++) {
                    var p = lines[i].substring(j, j + 2);
                    var ind = line.indexOf(p, recentInd);
                    if (ind == -1) {
                        lineScores[i]++;
                        recentInd = 0;
                    } else {
                        recentInd = ind;
                    }
                }
                //console.log(lineScores[i]);
            }

            let bestLine = 0;
            let equalBest = new List();
            let bestScore = 10000000;
            for (i = 0; i < lineScores.length; i++) {
                if (lineScores[i] < bestScore) {
                    bestLine = i;
                    bestScore = lineScores[i];
                    equalBest.clear();
                    equalBest.add(i);
                } else if (lineScores[i] == bestScore) {
                    equalBest.add(i);
                }
            }
            if (equalBest.length > 1) {
                //console.log('Equal Lines: ' + equalBest.length);
                if (recentLine.has(msg.channel)) {
                    let rl = recentLine.get(msg.channel) + 1;
                    //console.log('Recent Line: ' + rl);
                    let diff = 1000000;
                    equalBest.forEach(lind => {
                        if (Math.abs(rl - lind) <= diff) {
                            bestLine = lind;
                            diff = Math.abs(rl - lind);
                        }
                    });
                }
                //console.log('Equal bests');
            }
            if (bestScore > lines[bestLine].length / 2) {
                //msg.reply('No lines are close enough to this query');
            } else {
                recentLine.set(msg.channel, bestLine);
                //msg.reply('This is close: ' + lines[bestLine] + ' (Score: ' + bestScore + ', Length:' + lines[bestLine].length + ')');
                fs.readFile('linetime', 'utf8', (err, data) => {
                    if (err) throw err;

                    try {
                        linetimes = data.split('\n');
                        bot.voiceConnections.forEach(conn => {
                            if (conn.channel.guild == msg.guild) {
                                let t1 = Number(linetimes[bestLine].split(' ')[0]);
                                let t2 = Number(linetimes[bestLine].split(' ')[1]);
                                let stdis = conn.playFile('/Users/ryanmagilton/Desktop/Random/Aww Man Bot/Audio/' + linetimes[bestLine].split(' ')[2] + '.mp3', {seek: t1});
                                let mult = 0;
                        if (line.includes('+')) {
                            let adt = line.substring(line.indexOf('+') + 1);
                            if (Number(adt)) {
                                mult = Number(adt) * 1000;
                            }
                        }
                                stdis.on('start', () => {
                                    conn.player.streamingData.pausedTime = 0;
                                    setTimeout(() => {
                                        stdis.end();
                                       //conn.playFile('/Users/ryanmagilton/Desktop/Random/Aww Man Bot/Audio/none.mp3');
                                 }, ((t2 - t1) * 1000) + mult);
                               }); 
                            }
                        });
                    } catch (e) {
                        console.log("can't play file");
                    }
                });
            }
        }
        }
    }
});
/**
 * Checks if a pack is installed
 * @param {string} pname pack name
 * @param {message} msg message requesting pack
 */
function testForPack(pname, msg) {
    let apacks = msg.guild.channels.find('name', 'audio-packs');
    if (pname == 'revenge') {

    } else if (pname == 'allstar') {

    } else if (pname == 'rickroll') {

    } else {
        if (!apacks || apacks.type != 'text') {
            msg.channel.send(pname + ' is not added, use t2s:add to add packs.')
            return;
        } else {
            apacks.fetchMessages().then(msgs => {
                let pinfo;
                let paud;
                msgs.forEach(m => {
                    let m2 = m;
                    if (m.member.id == bot.user.id && m.content.startsWith('```Title: ' + pname)) {
                        pinfo = m2;
                    }
                    if (m.member.id == bot.user.id && m.content.startsWith(pname + '.mp3')) {
                        paud = m2;
                    }
                });
                
                
            });
        }
    }
}
/**
 * Sends a list of installed packs on a guild
 * @param {message} msg message requesting list
 */
function sendList(msg) {
    var f = '\nDefault:';
    var aps = '';
    let apacks = msg.guild.channels.find('name', 'audio-packs');
    if (!apacks || apacks.type != 'text') {
        msg.channel.send('```' + f + '\nRevenge\nAll Star\nRick Roll' + '```');
        return;
    }
    apacks.fetchMessages().then(msgs => {
        msgs.forEach(m => {
            if (m.member.id == bot.user.id && m.content.startsWith('```Default Pack')) {
                if (m.content.includes('DISABLED')) {
                    f += ' (Disabled)';
                } else {
                    f += ' (Enabled)';
                }
            }
            if (m.member.id == bot.user.id && m.content.startsWith('```Title: ')) {
                aps += m.content.substring(10, m.content.indexOf('\n'));
                if (m.content.includes('Disabled')) {
                    aps += ' (Disabled)\n';
                } else {
                    aps += '\n';
                }
            }
        });
        f += '\nRevenge\nAll Star\nRick Roll';
        msg.channel.send('```' + f + '\n\nAdded Packs:\n' + aps + '```');
        
    });
}

/**
 * Sends an embed of all packs available for installation
 * @param {number} page the page number requested
 * @param {message} msg message requesting library
 */
function loadLibrary(page, msg) {
    var pageLength = 10;
    fs.readFile('imported', 'utf8', (err, data) => {
        if (err) throw err;
        pdata = data;
        let sdata = pdata.split('\n');
        var totalSongs = sdata.length / 4;
        var pages = Math.ceil(totalSongs / pageLength);

        var fin = '';
        if (page < pages) {
            for (i = pageLength * 4 * page; (i < sdata.length) && (i < ((pageLength * 4 * page) + (pageLength * 4))); i++) {
                if (sdata[i].startsWith('Title: ')) {
                    fin += sdata[i].substring(7) + '\n';
                }
            }

            if (msg.member.id != botid) {
            msg.channel.send({
                embed: {
                    title: 'Audio Pack Library ' + page,
                    description: fin,
                    color: 6553700
                }
            }).then(nm => {
                if (page != 0) {
                    nm.react('◀').then(() => {
                        nm.react('❌').then(() => {
                            if (page + 1 < pages) {
                                nm.react('▶');
                            }
                        });
                    });
                } else {
                    nm.react('❌').then(() => {
                        if (page + 1 < pages) {
                            nm.react('▶');
                        }
                    });
                }
            });
            } else {
                msg.edit({
                    embed: {
                        title: 'Audio Pack Library ' + page,
                        description: fin,
                        color: 6553700
                    }
                }).then(nm => {
                    if (page != 0) {
                        nm.react('◀').then(() => {
                            nm.react('❌').then(() => {
                                if (page + 1 < pages) {
                                    nm.react('▶');
                                }
                            });
                        });
                    } else {
                        nm.react('❌').then(() => {
                            if (page + 1 < pages) {
                                nm.react('▶');
                            }
                        });
                    }
                });
            }
            
        }
    });
}

/**
 * Adds a pack to a guild
 * @param {message} msg command to add pack
 * @param {string} fdata file information
 * @param {string} flink file link
 */
function addPack (msg, fdata, flink) {
    let uid = fdata.substring(fdata.indexOf('User: ') + 6, fdata.indexOf('\n', fdata.indexOf('User: ') + 6));
                bot.fetchUser(uid).then(ubi => {
                    fdata = fdata.replace(uid, ubi.username + '#' + ubi.discriminator);
                    let apacks = msg.guild.channels.find('name', 'audio-packs');
                    let good = true;
                    apacks.fetchMessages().then(msgs => {
                        msgs.forEach(m => {
                            if (m.member.id == bot.user.id && m.content.startsWith('```Title: ' + fdata.substring(fdata.indexOf('Title: ') + 7, fdata.indexOf('\n', fdata.indexOf('Title: ') + 7)))) {
                                msg.reply('This pack is already installed!');
                                good = false;
                            }
                        });
                        if (good) {
                        request.get(flink.substring(6), function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                let s = body.split('\n');
                                let sl = '';
                                for (i = 0; i < s.length; i++) {
                                    //console.log(s[i]);
                                    if (s[i] == "SoundLink:") {
                                        sl = s[i+1];
                                    }
                                }
                                if (sl == '') {
                                    msg.reply('Error accessing sound file! (Make sure sharing is on & the file is formatted properly)');
                                } else {
                                    var mm;
                                    msg.channel.send('Adding ' + fdata.substring(7, fdata.indexOf('\n')) + '...').then(ms => {
                                        mm = ms;
                                    });
                                    apacks.send("```" + fdata + '\n\nEnabled (Click the X to disable)' + "```").then(m => {
                                        m.react('❌');
                                    });
                                    apacks.send({files: [{
                                        attachment: sl,
                                        name: fdata.substring(7, fdata.indexOf('\n')) + '.mp3'
                                    }]}).then(() => {
                                        if (mm) {
                                            mm.edit('Added ' + fdata.substring(7, fdata.indexOf('\n')) + ' successfully!');
                                        }
                                    });
                                    //apacks.send('```'+ fdata.substring(7, fdata.indexOf('\n')) + ' is Enabled, react to disable```').then(m => {
                                    //    m.react('❌');
                                    //});
                                }
                            } else {
                                msg.reply('Error accessing sound file! (Could not reach file link)');
                            }
                        });
                    }
                    });
                    //console.log(flink);
                    
                });
}

// Handles messages being deleted a guild's the audio-packs channel
bot.on('messageDelete', msg => {
    //console.log(msg.channel.name + ' ' + msg.member.id + ' ' + msg.content);
    if (msg.channel.name == 'audio-packs' && msg.member.id == botid && msg.content.startsWith('```Default Pack')) {
        msg.channel.send('```Default Pack (Revenge, All Star, Rick Roll) DISABLED```').then(m => {
            m.react('✅');
        });
    }
});

// Handles reactions on messages for audio-packs channel and navigating library embed
bot.on('messageReactionAdd', mR => {
    //console.log(mR.emoji.name);
    var msg = mR.message;
    if (mR.emoji.name == '❌' && mR.count > 1 && msg.channel.name == 'audio-packs' && msg.member.id == botid && msg.content.startsWith('```Title: ') && msg.content.includes('Enabled')) {
        var mls = msg.content.split('\n');
        var nmc = mls[0] + '\n' + mls[1] + '\n' + mls[2] + '\n' + mls[3] + '\n' + mls[4] + '\n' + mls[5] + '\n' + 'Disabled (Click the Check to enable)```';
        msg.edit(nmc);
        msg.clearReactions().then(nm => {
            nm.react('✅');
        });
    }
    if (mR.emoji.name == '✅' && mR.count > 1 && msg.channel.name == 'audio-packs' && msg.member.id == botid && msg.content.startsWith('```Title: ') && msg.content.includes('Disabled')) {
        var mls = msg.content.split('\n');
        var nmc = mls[0] + '\n' + mls[1] + '\n' + mls[2] + '\n' + mls[3] + '\n' + mls[4] + '\n' + mls[5] + '\n' + 'Enabled (Click the X to disable)```';
        msg.edit(nmc);
        msg.clearReactions().then(nm => {
            nm.react('❌');
        });
    }
    if (mR.emoji.name == '❌' && mR.count > 1 && msg.channel.name == 'audio-packs' && msg.member.id == botid && msg.content.startsWith('```Default Pack') && !msg.content.includes('DISABLED')) {
        msg.edit('```Default Pack (Revenge, All Star, Rick Roll) DISABLED```');
        msg.clearReactions().then(nm => {
            nm.react('✅');
        });
    }
    if (mR.emoji.name == '✅' && mR.count > 1 && msg.channel.name == 'audio-packs' && msg.member.id == botid && msg.content.startsWith('```Default Pack') && msg.content.includes('DISABLED')) {
        msg.edit('```Default Pack (Revenge, All Star, Rick Roll)```');
        msg.clearReactions().then(nm => {
            nm.react('❌');
        });
    }
    try {
        if (msg.embeds.length > 0 && msg.embeds[0].title.includes('Audio Pack Library') && mR.me) {
            let lp = Number(msg.embeds[0].title.split(' ')[3]);
            if (mR.emoji.name == '❌' && mR.count > 1) {
                msg.clearReactions();
            }
            if (mR.emoji.name == '◀' && mR.count > 1) {
                msg.clearReactions();
                loadLibrary(lp - 1, msg);
            }
            if (mR.emoji.name == '▶' && mR.count > 1) {
                msg.clearReactions();
                loadLibrary(lp + 1, msg);
            }
        }
    } catch (e) {

    }
})

// Used to search external audio packs for lyrics
function loadImportData (msg, addedPacks, addedPackNames, audioFiles, line, data, defaultOn) {
    //console.log('new\n' + addedPacks[0] + '\n' + addedPackNames[0]);
    var importedData = new Array(addedPacks.length);
    
//    loadOnePack(0, importedData, msg, addedPacks, addedPackNames, audioFiles, line, data, defaultOn);
    for (c = 0; c < addedPacks.length; c++) {
        let i = c;
        request.get(addedPacks[i], function (error, response, body) {
            if (!error && response.statusCode == 200) {
                //console.log(body);
                var hasSL = false;
                var lyricStart;
                var dataStart;
                var timeStart;
                var sbody = body.split('\n');
                for (j = 0; j < sbody.length; j++) {
                    if (sbody[j] == 'SoundLink:') {
                        hasSL = true;
                    }
                    if (sbody[j] == 'Lyrics:') {
                        lyricStart = j;
                    }
                    if (sbody[j] == 'Linedata:') {
                        dataStart = j;
                    }
                    if (sbody[j] == 'Linetimes:') {
                        timeStart = j;
                    }
                }
                if (hasSL && lyricStart && dataStart && timeStart) {
                    importedData[i] = body;
                    //console.log(body);
                    //console.log(importedData[i]);
                } else {
                    msg.channel.send('Error reading **' + addedPackNames[i] + '** audio pack file. It is not formatted correctly.');
                    return;
                }
            } else {
                msg.channel.send('Error reading **' + addedPackNames[i] + '** audio pack file. Maybe it is private?');
                return;
            }

            //console.log(i);
            //console.log(addedPacks.length);
            /*if (i + 1 == addedPacks.length) {
                //console.log('1');
                try {
                    //console.log('2');
                    var finalData = await Promise.all(importedData);
                    determineLineImport(msg, finalData, audioFiles, line, data, defaultOn, addedPackNames);
                } catch (e) {
                    console.log(e);
                }
            } */
        });
    }
    
    /*Promise.all(importedData).then(function(finalData) {
        console.log(importedData[0]);
        determineLineImport(msg, finalData, audioFiles, line, data, defaultOn, addedPackNames);
    });*/
    
    setTimeout(testReady, 1, msg, importedData, audioFiles, line, data, defaultOn, addedPackNames, 0);

}

// Called when external packs are done loading
function testReady (msg, importedData, audioFiles, line, data, defaultOn, addedPackNames, count) {
    var done = true;
    for (i = 0; i < importedData.length; i++) {
        if (!importedData[i]) {
            done = false;
        }
    }

    if (done) {
        determineLineImport(msg, importedData, audioFiles, line, data, defaultOn, addedPackNames);
    } else {
        if (count < 5000) {
            setTimeout(testReady, 1, msg, importedData, audioFiles, line, data, defaultOn, addedPackNames, count + 1);
        } else {
            msg.channel.send('Took too long to search audio packs, or maybe there was an error reading them.');
        }
    }

}

// Used to search one external audio pack for lyrics
function loadOnePack(c, importedData, msg, addedPacks, addedPackNames, audioFiles, line, data, defaultOn) {
    let i = c;
    if (addedPacks.length <= c) {
        determineLineImport(msg, importedData, audioFiles, line, data, defaultOn, addedPackNames);
    } else {
        request.get(addedPacks[i], function (error, response, body) {
            if (!error && response.statusCode == 200) {
                //console.log(body);
                var hasSL = false;
                var lyricStart;
                var dataStart;
                var timeStart;
                var sbody = body.split('\n');
                for (j = 0; j < sbody.length; j++) {
                    if (sbody[j] == 'SoundLink:') {
                        hasSL = true;
                    }
                    if (sbody[j] == 'Lyrics:') {
                        lyricStart = j;
                    }
                    if (sbody[j] == 'Linedata:') {
                        dataStart = j;
                    }
                    if (sbody[j] == 'Linetimes:') {
                        timeStart = j;
                    }
                }
                if (hasSL && lyricStart && dataStart && timeStart) {
                    importedData[i] = body;
                    //console.log(body);
                    //console.log(importedData[i]);
                } else {
                    msg.channel.send('Error reading **' + addedPackNames[i] + '** audio pack file. It is not formatted correctly.');
                    return;
                }
            } else {
                msg.channel.send('Error reading **' + addedPackNames[i] + '** audio pack file. Maybe it is private?');
                return;
            }

            //console.log(i);
            //console.log(addedPacks.length);
            if (i + 1 >= addedPacks.length) {
                //console.log('1');
                try {
                    //console.log('2');
                    //var finalData = importedData; //await Promise.all(importedData);
                    determineLineImport(msg, importedData, audioFiles, line, data, defaultOn, addedPackNames);
                } catch (e) {
                    console.log(e);
                }
            } else {
                loadOnePack(c + 1, importedData, msg, addedPacks, addedPackNames, audioFiles, line, data, defaultOn)
            }
        });
    }
}

// Used to determine which lyric to play after a message
function determineLineImport (msg, importedData, audioFiles, line, data, defaultOn, addedPackNames) {

    //console.log(importedData);

    var allLyrics = new List();
    var allData = new List();
    var allTimes = new List();
    //linetimes;
    if (defaultOn) {
        //console.log('using default');
        for (i = 0; i < lines.length; i++) {
            allLyrics.add(lines[i].trim());
            allData.add(linedata[i]);
            allTimes.add('READ LOCAL');
        }
    } else if (!importedData || importedData.length == 0) {
        msg.channel.send('No valid packs detected');
        return;
    }
    //console.log(importedData);
    for (i = 0; i < importedData.length; i++) {
        //console.log(i);
        //console.log(importedData[i]);
        let sbody = importedData[i].split('\n');
        //console.log(sbody);
        let sL;
        let lyricStart;
        let dataStart;
        let timeStart;
        //var sbody = body.split('\n');
        for (j = 0; j < sbody.length; j++) {
            if (sbody[j] == 'SoundLink:') {
                sL = sbody[j+1];
            }
            if (sbody[j] == 'Lyrics:') {
                lyricStart = j;
            }
            if (sbody[j] == 'Linedata:') {
                dataStart = j;
            }
            if (sbody[j] == 'Linetimes:') {
                timeStart = j;
            }
            if (lyricStart && j > lyricStart && !dataStart) {
                allLyrics.add(sbody[j].trim());
                //console.log(sbody[j]);
            }
            if (dataStart && j > dataStart && !timeStart) {
                allData.add(sbody[j]);
            }
            if (timeStart && j > timeStart) {
                allTimes.add(sbody[j] + ' ' + addedPackNames[i]);
            }
        }
    }
    
    allLyrics = allLyrics.toArray();
    allData = allData.toArray();
    allTimes = allTimes.toArray();

    allLyrics.forEach(li => {
        //console.log(li);
    })

    var lcs = data.substring(0, data.length - 1).split(' ');
    var lineScores = new Array(allData.length);
    for (i = 0; i < allData.length; i++) {
        let rlcs = allData[i].split(' ');
        lineScores[i] = 0;
        for (j = 0; j < rlcs.length - 1; j++) {
            lineScores[i] += Math.abs(Number(lcs[j]) - Number(rlcs[j]));
        }
        var recentInd = 0;
        for (j = 0; j < allLyrics[i].length - 1; j++) {
            var p = allLyrics[i].substring(j, j + 2);
            var ind = line.indexOf(p, recentInd);
            if (ind == -1) {
                lineScores[i]++;
                recentInd = 0;
            } else {
                recentInd = ind;
            }
        }
        //console.log(lineScores[i]);
    }

    let bestLine = 0;
    let equalBest = new List();
    let bestScore = 10000000;
    for (i = 0; i < lineScores.length; i++) {
        if (lineScores[i] < bestScore) {
            bestLine = i;
            bestScore = lineScores[i];
            equalBest.clear();
            equalBest.add(i);
        } else if (lineScores[i] == bestScore) {
            equalBest.add(i);
        }
    }
    if (equalBest.length > 1) {
        //console.log('Equal Lines: ' + equalBest.length);
        if (recentLine.has(msg.channel)) {
            let rl = recentLine.get(msg.channel) + 1;
            //console.log('Recent Line: ' + rl);
            let diff = 1000000;
            equalBest.forEach(lind => {
                //console.log(lind);
                //console.log(Math.abs(rl - lind));
                if (Math.abs(rl - lind) <= diff) {
                    bestLine = lind;
                    diff = Math.abs(rl - lind);
                }
            });
        }
        //console.log(bestLine);
    }
    if (bestScore > allLyrics[bestLine].length / 2) {
        //msg.reply('No lines are close enough to this query');
    } else {
        clearTimeout(disableTC.get(msg.channel));
        disableTC.set(msg.channel, setTimeout(() => {
            msg.member.voiceChannel.leave();
            activeTC.delete(msg.channel);
            msg.channel.send('I am no longer active in this text channel due to lack of activity.');
            disableTC.delete(msg.channel);
        }, voiceTimeout));

        recentLine.set(msg.channel, bestLine);
        //msg.reply('This is close: ' + lines[bestLine] + ' (Score: ' + bestScore + ', Length:' + lines[bestLine].length + ')');

        if (allTimes[bestLine] == 'READ LOCAL') {
            fs.readFile('linetime', 'utf8', (err, data) => {
                if (err) throw err;

                try {
                    linetimes = data.split('\n');
                    bot.voiceConnections.forEach(conn => {
                        if (conn.channel.guild == msg.guild) {
                            let t1 = Number(linetimes[bestLine].split(' ')[0]);
                            let t2 = Number(linetimes[bestLine].split(' ')[1]);
                            let stdis = conn.playFile('/Users/ryanmagilton/Desktop/Random/Aww Man Bot/Audio/' + linetimes[bestLine].split(' ')[2] + '.mp3', {seek: t1});
                            let mult = 0;
                            if (line.includes('+')) {
                                //console.log('has +');
                                let adt = line.substring(line.indexOf('+') + 1);
                                //console.log(adt);
                                if (Number(adt)) {
                                    mult = Number(adt) * 1000;
                                    //console.log(mult);
                                }
                            }
                            stdis.on('start', () => {
                                conn.player.streamingData.pausedTime = 0;
                                setTimeout(() => {
                                    stdis.end();
                                   //conn.playFile('/Users/ryanmagilton/Desktop/Random/Aww Man Bot/Audio/none.mp3');
                             }, ((t2 - t1) * 1000) + mult);
                           }); 
                        }
                    });
                } catch (e) {
                    console.log("can't play file");
                }
            });
        } else {
        try {
            //linetimes = data.split('\n');
            bot.voiceConnections.forEach(conn => {
                if (conn.channel.guild == msg.guild) {
                    let t1 = Number(allTimes[bestLine].split(' ')[0]);
                    let t2 = Number(allTimes[bestLine].split(' ')[1]);
                    //let stdis = conn.playFile('/Users/ryanmagilton/Desktop/Random/Aww Man Bot/Audio/' + linetimes[bestLine].split(' ')[2] + '.mp3', {seek: t1});
                    //console.log('here');
                    var faf;
                    audioFiles.forEach(af => {
                        if (af && af.attachments.first().filename == allTimes[bestLine].split(' ')[2] + '.mp3')  {
                            faf = af.attachments.first().url;
                        }
                    });
                    if (faf) {
                        let stdis = conn.playStream(faf, {seek: t1});
                        let mult = 0;
                        if (line.includes('+')) {
                            let adt = line.substring(line.indexOf('+') + 1);
                            if (Number(adt)) {
                                mult = Number(adt) * 1000;
                            }
                        }
                        stdis.on('start', () => {
                            conn.player.streamingData.pausedTime = 0;
                            setTimeout(() => {
                                stdis.end();
                               //conn.playFile('/Users/ryanmagilton/Desktop/Random/Aww Man Bot/Audio/none.mp3');
                         }, ((t2 - t1) * 1000) + mult);
                       }); 
                    } else {
                        msg.channel.send('No audio file for **' + allTimes[bestLine].split(' ')[2] + '** found');
                        return;
                    }
                }
            });
        } catch (e) {
            msg.channel.send('Error playing sound from pack **' + allTimes[bestLine].split(' ')[2] + '**');
            console.log(e);
        }
    }
    }
}