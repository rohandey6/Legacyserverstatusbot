'use strict';
require('dotenv').config()
const Discord = require('discord.js');
const fetchTimeout = require('fetch-timeout');
//const { paddedFullWidth, errorWrap } = require('./utils.js');

if (Discord.version.startsWith('12.')) {
  Discord.RichEmbed = Discord.MessageEmbed;
  Discord.TextChannel.prototype.fetchMessage = function(snowflake) { 
    return this.messages.fetch.apply(this.messages,[snowflake]);

  }
  Object.defineProperty(Discord.User.prototype,'displayAvatarURL',{
    'get': function() {
      return this.avatarURL();
    }
  })

}

const LOG_LEVELS = {
  'ERROR': 3,
  'INFO': 2,
  'DEBUG': 1,
  'SPAM': 0
}

const BOT_CONFIG = {
  'apiRequestMethod': 'sequential',
  'messageCacheMaxSize': 50,
  'messageCacheLifetime': 0,
  'messageSweepInterval': 0,
  'fetchAllMembers': false,
  'disableEveryone': true,
  'sync': false,
  'restWsBridgeTimeout': 5000, // check these
  'restTimeOffset': 300,
  'disabledEvents': [
    'CHANNEL_PINS_UPDATE',
    'TYPING_START'
  ],
  'ws': {
    'large_threshold': 100,
    'compress': true
  }
}

const USER_AGENT = `FiveM IMPACT RP bot ${require('./package.json').version} , Node ${process.version} (${process.platform}${process.arch})`;



exports.start = function(SETUP) {
  const URL_SERVER = SETUP.URL_SERVER;

  const URL_PLAYERS = new URL('http://5.196.246.65:30123/players.json',SETUP.URL_SERVER).toString();
  const URL_INFO = new URL('http://5.196.246.65:30123/info.json',SETUP.URL_SERVER).toString();
  const MAX_PLAYERS = 45;
  const TICK_MAX = 1 << 9; // max bits for TICK_N
  const FETCH_TIMEOUT = 900;
  const FETCH_OPS = {
    'cache': 'no-cache',
    'method': 'GET',
    'headers': { 'User-Agent': USER_AGENT }
  };

  const LOG_LEVEL = SETUP.LOG_LEVEL !== undefined ? parseInt(SETUP.LOG_LEVEL) : LOG_LEVELS.INFO;
  const CHANNEL_ID = SETUP.CHANNEL_ID;
  const MESSAGE_ID = SETUP.MESSAGE_ID;
  const SUGGESTION_CHANNEL = SETUP.SUGGESTION_CHANNEL;
  const BUG_CHANNEL = SETUP.BUG_CHANNEL;
  const BUG_LOG_CHANNEL = SETUP.BUG_LOG_CHANNEL;
  const REPORT_CHANNEL = SETUP.REPORT_CHANNEL;
  const REPORT_LOG_CHANNEL = SETUP.REPORT_LOG_CHANNEL;
  const LOG_CHANNEL = SETUP.LOG_CHANNEL;
  const STREAM_URL = SETUP.STREAM_URL;
  const STREAM_CHANNEL = SETUP.STREAM_CHANNEL;
  const UPDATE_TIME = 2500; // in ms

  var TICK_N = 0;
  var MESSAGE;
  var LAST_COUNT;
  var STATUS;

  var STREAM_DISPATCHER = undefined;

  var loop_callbacks = []; // for testing whether loop is still running

  const log = function(level,message) {
    if (level >= LOG_LEVEL) console.log(`${new Date().toLocaleString()} :${level}: ${message}`);
  };

  const getPlayers = function() {
    return new Promise((resolve,reject) => {
      fetchTimeout(URL_PLAYERS,FETCH_OPS,FETCH_TIMEOUT).then((res) => {
        res.json().then((players) => {
          resolve(players);
        }).catch(reject);
      }).catch(reject);
    })
  };

  const getVars = function() {
    return new Promise((resolve,reject) => {
      fetchTimeout(URL_INFO,FETCH_OPS,FETCH_TIMEOUT).then((res) => {
        res.json().then((info) => {
          resolve(info.vars);
        }).catch(reject);
      }).catch(reject);
    });
  };

  const bot = new Discord.Client(BOT_CONFIG);

  const sendOrUpdate = function(embed) {
    if (MESSAGE !== undefined) {
      MESSAGE.edit(embed).then(() => {
        log(LOG_LEVELS.DEBUG,'Update success');
      }).catch(() => {
        log(LOG_LEVELS.ERROR,'Update failed');
      })
    } else {
      let channel = bot.channels.get(CHANNEL_ID);
      if (channel !== undefined) {
        channel.fetchMessage(MESSAGE_ID).then((message) => {
          MESSAGE = message;
          message.edit(embed).then(() => {
            log(LOG_LEVELS.SPAM,'Update success');
          }).catch(() => {
            log(LOG_LEVELS.ERROR,'Update failed');
          });
        }).catch(() => {
          channel.send(embed).then((message) => {
            MESSAGE = message;
            log(LOG_LEVELS.INFO,`Sent message (${message.id})`);
          }).catch(console.error);
        })
      } else {
        log(LOG_LEVELS.ERROR,'Update channel not set');
      }
    }
  };

  const UpdateEmbed = function() {
    let dot = TICK_N % 2 === 0 ? 'Roleplay' : 'Roleplay';
    let embed = new Discord.RichEmbed()
    return embed;
  };

  const offline = function() {
    log(LOG_LEVELS.SPAM,Array.from(arguments));
    if (LAST_COUNT !== null) log(LOG_LEVELS.INFO,`Server Offline ${URL_SERVER} (${URL_PLAYERS} ${URL_INFO})`);
    //------FUNCTION-------------
    //------SERVER NAME-------------
    let off =  ':octagonal_sign:'+ "** #1 Server:-** `SERVER IP` **Server Is Currently Offline**" +'';
     //------'"  | """-------------
    let l =  ' | '+ `` +'';
    //--------Conneaction players:----------
    let conn =  '**Connecting Players:- ** '+ `N/A`;+'';
     //--------Total Players:---------
    let ply =  '**Total Players:-** '+ `N/A` +'';
    //--------Last Refreshed:----------
    let tim =  '**Last Refreshed:-** '+ new Date().toLocaleString()+'';
    //--------Name:----------
    let na =  '**Lavda Roleplay-India Live Server Status:-**'+ "᲼" +'';
     //--------Total Players:---------
     let tols =  '**Total Players:-** '+ `N/A` +'';
          //--------Version:---------
          let vvs =  '**Server Version:-** '+ `N/A` +'';
         //--------Last Refreshed:----------
    let times =  '**Last Refresh:-** '+ new Date().toLocaleString();+'';
    let embed = ("\n\n"+na+"\n"+"\n"+off+"\n\n"+vvs+l+tols+l+times);
    //------bOT ACTIVITY-------------
    bot.user.setActivity('Server Is Offline', { type: "PLAYING" });
    sendOrUpdate(embed);
    LAST_COUNT = null;
  };

  const updateMessage = function() {
    getVars().then((vars) => {
      getPlayers().then((players) => {
        if (players.length !== LAST_COUNT) log(LOG_LEVELS.INFO,`${players.length} players`);
        let queue = vars['Queue'];
        //------FUNCTION-------------
        //------SERVER NAME-------------
        let serv =  ':white_check_mark: '+ "**#1Server:-** `SERVER IP`" +'';
        //------'"  | """-------------
        let s =  ' | '+ `` +'';
        //--------Total Players:---------
        let ver =  '**Players:-** '+ `${players.length}/${vars.sv_maxClients}` +'';
        //--------Queue:----------
        let que =  '**Queue:-** '+ `${vars.sv_queueCount}` +'';
       //--------UPTIME:----------
       let upt =  '**Uptime:-** '+ `${vars.Uptime}` +'';
        //--------Total Players:---------
        let tol =  '**Total Players:-** '+ `${players.length}/${vars.sv_maxClients}` +'';
               //--------Versiom:----------
       let svv =  '**Server Version:-** '+ `${vars.version}` +'';
        //--------Connecting players:----------
         let con =  '**Connecting Players:-** '+ `${vars.sv_queueConnectingCount}`;+'';
    //--------Name:----------
    let na =  '**Lavda Roleplay-India Live Server Status:-**'+ "᲼" +'';
     let embed = ("\n\n"+na+"\n\n"+serv+s+ver+s+con+s+que+s+upt+"\n\n"+svv+s+tol+s+time);  //|   '+upt +"\n\n"+ver+ " | " +time);
        //------bOT ACTIVITY-------------
       bot.user.setActivity('Players:- '+`${players.length}/${vars.sv_maxClients}`, { type: "PLAYING" });
        if (players.length > 0) {
          // method D
          const fieldCount = 3;
          const fields = new Array(fieldCount);
          fields.fill('');
        
        }
        sendOrUpdate(embed);
        LAST_COUNT = players.length;
      }).catch(offline);
    }).catch(offline);
    TICK_N++;
    if (TICK_N >= TICK_MAX) {
      TICK_N = 0;
    }
    for (var i=0;i<loop_callbacks.length;i++) {
      let callback = loop_callbacks.pop(0);
      callback();
    }
  };

  bot.on('ready',() => {
    log(LOG_LEVELS.INFO,'Geeting Gateway From......... (• Çhå¢hå ÇhðµÐhår¥ •#5555)');
    bot.generateInvite(['ADMINISTRATOR']).then((link) => {
      log(LOG_LEVELS.INFO,`Invite URL - ${link}`);
      log(LOG_LEVELS.INFO,'All Set See Your Server Status Now!!!!');
    }).catch(null);
    bot.setInterval(updateMessage, UPDATE_TIME);
  });



  function checkLoop() {
    return new Promise((resolve,reject) => {
      var resolved = false;
      let id = loop_callbacks.push(() => {
        if (!resolved) {
          resolved = true;
          resolve(true);
        } else {
          log(LOG_LEVELS.ERROR,'Loop callback called after timeout');
          reject(null);
        }
      })
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      },3000);
    })
  }

  bot.on('debug',(info) => {
    log(LOG_LEVELS.SPAM,info);
  })

  bot.on('error',(error,shard) => {
    log(LOG_LEVELS.ERROR,error);
  })

  bot.on('warn',(info) => {
    log(LOG_LEVELS.DEBUG,info);
  })

  bot.on('disconnect',(devent,shard) => {
    log(LOG_LEVELS.INFO,'Disconnected');
    checkLoop().then((running) => {
      log(LOG_LEVELS.INFO,`Loop still running: ${running}`);
    }).catch(console.error);
  })

  bot.on('reconnecting',(shard) => {
    log(LOG_LEVELS.INFO,'Reconnecting');
    checkLoop().then((running) => {
      log(LOG_LEVELS.INFO,`Loop still running: ${running}`);
    }).catch(console.error);
  })

  bot.on('resume',(replayed,shard) => {
    log(LOG_LEVELS.INFO,`Resuming (${replayed} events replayed)`);
    checkLoop().then((running) => {
      log(LOG_LEVELS.INFO,`Loop still running: ${running}`);
    }).catch(console.error);
  })

  bot.on('rateLimit',(info) => {
    log(LOG_LEVELS.INFO,`Rate limit hit ${info.timeDifference ? info.timeDifference : info.timeout ? info.timeout : 'Unknown timeout '}ms (${info.path} / ${info.requestLimit ? info.requestLimit : info.limit ? info.limit : 'Unkown limit'})`);
    if (info.path.startsWith(`/channels/${CHANNEL_ID}/messages/${MESSAGE_ID ? MESSAGE_ID : MESSAGE ? MESSAGE.id : ''}`)) bot.emit('restart');
    checkLoop().then((running) => {
      log(LOG_LEVELS.DEBUG,`Loop still running: ${running}`);
    }).catch(console.error);
  })
  
  bot.on('message', async function (msg) {
    if (msg.channel.id === '818491732218871831') {
        await msg.react(bot.emojis.get('587057796936368128'));
        await msg.react(bot.emojis.get('595353996626231326'));
    }
});

  bot.on('message',(message) => {
    if (!message.author.bot) {
      if (message.member) {
        if (message.member.hasPermission('ADMINISTRATOR')) {
          if (message.content.startsWith('+status ')) {
            let status = message.content.substr(7).trim();
            let embed =  new Discord.RichEmbed()
            .setAuthor(message.member.nickname ? message.member.nickname : message.author.tag,message.author.displayAvatarURL)
            .setColor('RANDOM')
            .setTitle('Updated status message')
            .setTimestamp(new Date());
            if (status === 'clear') {
              STATUS = undefined;
              embed.setDescription('Cleared status message');
            } else {
              STATUS = status;
              embed.setDescription(`New message:\n\`\`\`${STATUS}\`\`\``);
            }
            bot.channels.get(LOG_CHANNEL).send(embed);
            return log(LOG_LEVELS.INFO,`${message.author.username} updated status`);
          }
        }
        if (message.content.startsWith('+suggest')) {
        if (message.channel.id === SUGGESTION_CHANNEL) {
          let embed = new Discord.RichEmbed()
          .setAuthor(message.member.nickname ? message.member.nickname : message.author.tag,message.author.displayAvatarURL)
          .setColor('RANDOM')
            .setTitle('Suggestion')
          .setDescription(message.content)
          .setTimestamp(new Date());
          message.channel.send(embed).then((message) => {
            const sent = message;
            sent.react('✔️').then(() => {
              sent.react('❌').then(() => {
                log(LOG_LEVELS.SPAM,'Completed suggestion message');
              }).catch(console.error);
            }).catch(console.error);
          }).catch(console.error);
          return message.delete();
        }
      }
        if (message.content.startsWith('+bug')) {
        if (message.channel.id === BUG_CHANNEL) {
          let embedUser = new Discord.RichEmbed()
          .setAuthor(message.member.nickname ? message.member.nickname : message.author.tag,message.author.displayAvatarURL)
          .setColor('RANDOM')
          .setTitle('Bug Report')   
             .setDescription('Your Message Has Been Successfully Sent!!') 
          .setTimestamp(new Date());
          let embedStaff = new Discord.RichEmbed()
          .setAuthor(message.member.nickname ? message.member.nickname : message.author.tag,message.author.displayAvatarURL)
          .setColor(0xff0000)
          .setTitle('Bug Report')
          .setDescription(message.content)
          .setTimestamp(new Date());
          message.channel.send(embedUser).then(null).catch(console.error);
          bot.channels.get(BUG_LOG_CHANNEL).send(embedStaff).then(null).catch(console.error);
          return message.delete();
        }
      }
        if (message.content.startsWith('/report')) {
        if (message.channel.id === REPORT_CHANNEL) {
          let embedUser = new Discord.RichEmbed()
          .setAuthor(message.member.nickname ? message.member.nickname : message.author.tag,message.author.displayAvatarURL)
          .setColor('RANDOM')
          .setTitle('Report')
            .setDescription('Your Message Has Been Successfully Sent!!') 
          .setTimestamp(new Date());
          let embedStaff = new Discord.RichEmbed()
          .setAuthor(message.member.nickname ? message.member.nickname : message.author.tag,message.author.displayAvatarURL)
          .setColor(0xff0000)
          .setTitle('Pls Look Up The Report Admins/Moderator')
          .setDescription(message.content)
          .setTimestamp(new Date());
          message.channel.send(embedUser).then(null).catch(console.error);
          bot.channels.get(REPORT_LOG_CHANNEL).send(embedStaff).then(null).catch(console.error);
          return message.delete();
        }
      }
      }
    }
  });

  bot.login(process.env.BOT_TOKEN).then(null).catch(() => {
    log(LOG_LEVELS.ERROR,'Unable to login check your login token');
    console.error(e);
    process.exit(1);
  });

  return bot;
}
