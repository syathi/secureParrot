const line    = require('@line/bot-sdk');
const http    = require('http');
const fs      = require('fs'); 
const tokens  = require('./tokens.js')
const Twitter = require('twitter');
const Nedb    = require("nedb");

const app = http.createServer();
const client = new line.Client({
          channelAccessToken: tokens.line_channel_access_token
});
const twitClient = new Twitter({
  consumer_key: tokens.twitter_consumer_key,
  consumer_secret: tokens.twitter_consumer_secret,
  access_token_key: tokens.twitter_access_token_key,
  access_token_secret: tokens.twitter_access_token_secret
});
const userData = new Nedb({
  filename: './userData.db',
  autoload: true
});
const searchUsers = new Nedb({
  filename: "./searchUsers.db",
  autoload: true
});
const port = process.env.PORT || 8123;

console.log("server running on " + port);

process.on('uncaughtException', (err) => {
    console.log(err.stack);
});

app.on('request', (req, res) => {
  if(req.url === "/debug_on" && req.method === "POST") { 
    res.writeHead(200, {"Content-Type" : "text/plain"});
    searchUsers.find({"user": "sfeyrt"}, (err, user) =>{
      console.log(user);
      if(user.length > 0){
        res.write("debug mode have been already on");
        console.log("もうonやで");
        res.end('');
      } else {
        searchUsers.insert([{"user": "sfeyrt"}]);        
        res.write("debug mode on");
        console.log("onにしたで");
        res.end('');
      }
    })
    return;
  }
  if(req.url === "/debug_off" && req.method === "POST"){
    res.writeHead(200, {"ContentType" : "text/plain"});
    searchUsers.find({"user": "sfeyrt"}, (err, user) => {
      if(user.length > 0){
        searchUsers.remove({"user": "sfeyrt"});
        res.write("debug mode off");
        console.log("offにしたで");
        res.end('');
      } else {
        res.write("debug mode have been already off");
        console.log("もうoffやで");
        res.end('');
      }
    });
    return;  
  }
  if(req.url !== '/' || req.method !== 'POST'){
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('');
  }
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });        
  req.on('end', () => {
      if(body === ''){
        console.log('bodyが空です。');
        return;
      }
      let WebhookEventObject = JSON.parse(body).events[0];   
      //console.log(WebhookEventObject);     
      if(WebhookEventObject.type === 'message'){
        let message;
        if(WebhookEventObject.message.type === 'text'){
          const getTwit = new RegExp(/ツイートを(\d+件)?取得|get \d* tweet/)
          if(WebhookEventObject.message.text.match(getTwit)){
            const tmpArr     = WebhookEventObject.message.text.split(/(\d+)/);
            const getCnt     = tmpArr.length > 2 ? tmpArr[1] : 10;
            const messageTxt = getCnt !== 10 ? 'ツイートを' + getCnt + '件取得するピヨ' : 'ツイートを取得するピヨ';
            message = {
              type: 'text',
              text: messageTxt
            }
            const token = WebhookEventObject.replyToken;
            client.replyMessage(WebhookEventObject.replyToken, message).then( (body) => {
              console.log(body);
              twitClient.get('statuses/user_timeline', {screen_name : "sec_trend", count : getCnt}, (error, data, response) => {
                data.forEach( d => {
                  message = {
                    type: 'text',
                    text: d.text
                  };
                  const sendId = WebhookEventObject.source.groupId || WebhookEventObject.source.roomId  || WebhookEventObject.source.userId;
                  client.pushMessage(sendId , message).then( (body) => {
                    console.log(body);
                  })
                  .catch( (e) => {
                    console.log(e);
                  });
                });
              });
            })
            .catch( (e) => {
              console.log(e);
            });
          }
        }
        const addAccount = new RegExp(/add account [a-zA-z0-9_\-]+/);
        if(WebhookEventObject.message.text.match(addAccount)){
          const userId = WebhookEventObject.message.text.split(" ");
          searchUsers.insert({"user": userId[2]});
          message = {
            type: 'text',
            text: '@' + userId[2] + 'さんを監視ツイートに追加したピヨ。\n実在するアカウントかは確認してないから間違ってないかきちんと確認するピヨ！'
          };
          client.replyMessage(WebhookEventObject.replyToken, message).then( (body) => {
            console.log("user account add");
          }).catch( (e) => {
            console.log(e);
          });
        }
        const removeAccount = new RegExp(/remove account [a-zA-z0-9_\-]+/);
        if(WebhookEventObject.message.text.match(removeAccount)){
          const userId = WebhookEventObject.message.text.split(" ");
          searchUsers.remove({"user": userId[2]});
          message = {
            type: 'text',
            text: '@' + userId[2] + 'さんを監視ツイートから削除したピヨ' 
          };
          client.replyMessage(WebhookEventObject.replyToken, message).then( (body) => {
            console.log("user account removed");
          }).catch( (e) => {
            console.log(e);
          });
        }
      }
      if(WebhookEventObject.type === "follow"){
        console.log("followed");
        const message = {
          type: "text",
          text: "ツイートを取得、もしくはget tweetでセキュリティに関するアカウントのツイートを取得するピヨ！"
        }
        const userToken = WebhookEventObject.source.groupId || WebhookEventObject.source.roomId || WebhookEventObject.source.userId;
        client.replyMessage(WebhookEventObject.replyToken, message).then( (body) => {
          userData.insert([{"userToken": userToken}], (err, doc) => {
            console.log("inserted " + userToken);
          });
          console.log(body);
        })
        .catch( (e) => {
          console.log(e);
        });
      }
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('su');
  });
}).listen(port);

twitClient.stream('user', {}, (stream) => {
  console.log("streaming..");
  stream.on('data', (tweet) => {
    searchUsers.find({"user" : tweet.user.screen_name}, (err, screenName) => {
      console.log(tweet.text);
      const message = {
        type : 'text',
        text: tweet.text
      }; 
      userData.find({}, (err, push_users) => {
        push_users.forEach(user => {
          client.pushMessage(user.userToken, message)
            .then( (body) => {
              console.log(body);
            })
            .catch( (e) => {
              console.log(e);
            });
        });
      });
    })  
  });
 
  stream.on('error', (error) => {
    throw error;
  });
});