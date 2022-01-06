const express = require("express");
const request = require("request");
const app = express();
const bodyParser = require("body-parser");
const { Client, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const discord = require("discord.js");

const config = require("./config.json");
var discordid;

app.use(bodyParser.urlencoded({ extended: true }));

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

app.get("/", (req, res) => {
  var code = req.query.code;
  var options = {
    method: "POST",
    url: "https://discord.com/api/oauth2/token",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    form: {
      client_id: config.client_id,
      client_secret: config.client_secret,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: config.redirect_uri,
      scope: "identify",
    },
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    var parsed = JSON.parse(body);
    var options = {
      method: "GET",
      url: "https://discord.com/api/users/@me",
      headers: { authorization: `Bearer ${parsed.access_token}` },
    };

    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      if (response.statusCode != 200) {
        res.redirect(
          `https://discord.com/oauth2/authorize?client_id=${config.client_id}&redirect_uri=${config.redirect_uri}&response_type=code&scope=identify`
        );
        return;
      }
      var parsed = JSON.parse(body);
      discordid = parsed.id;
      res.sendFile("/verify.html", { root: __dirname });
    });
  });
});

app.post("/", (req, res) => {
  var options = {
    method: "POST",
    url: "https://hcaptcha.com/siteverify",
    headers: {
      "content-type":
        "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
    },
    formData: {
      secret: config.hcaptcha_secret,
      response: req.body["g-recaptcha-response"],
    },
  };

  request(options, async function (error, response, body) {
    if (error) throw new Error(error);
    const parsed = JSON.parse(body);
    if (parsed.success) {
      res.sendFile("/verified.html", { root: __dirname });
      const guild = await client.guilds.fetch(config.guild_id);
      const member = await guild.members.fetch(discordid);
      member.roles.add(config.role_id, `user is verified`);
      const user = client.users.cache.get(discordid);

      const embed = new discord.MessageEmbed()
        .setTitle("Verification")
        .setDescription(
          "You are now verified!"
        )
        .setColor("GREEN")
        .setTimestamp()
        .setFooter("Discord-hcaptcha");
      member.send({ embeds: [embed] });
    } else {
      res.redirect("/");
    }
  });
});

app.use(express.static("public"));

app.get("/", function (request, response) {
  response.sendFile(__dirname + "/verify.html");
});

var listener = app.listen(process.env.PORT || 8081, function() {
    console.log('Your app is listening on port ' + listener.address().port);
  });

client.login(config.bot_token);
