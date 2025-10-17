const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const cors = require('cors');

const app = express();

// إعداد CORS للسماح بجميع المصادر
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// 🔥 طريق الاختبار
app.get('/api/test', (req, res) => {
  console.log('✅ test endpoint called');
  res.json({ 
    success: true, 
    message: 'السيرفر شغال!',
    time: new Date().toISOString()
  });
});

// 🔥 طريق الحصول على السيرفرات
app.post('/api/get-guilds', async (req, res) => {
  console.log('📨 Received get-guilds request');
  
  try {
    const { botToken } = req.body;

    if (!botToken) {
      return res.json({ 
        success: false, 
        error: 'التوكن مطلوب' 
      });
    }

    console.log('🔑 Attempting to login with token...');

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
      ]
    });

    await client.login(botToken);
    console.log('✅ Logged in as:', client.user?.tag || 'Unknown');

    const guilds = client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name
    }));

    console.log('📊 Found ' + guilds.length + ' guilds');

    res.json({
      success: true,
      guilds: guilds,
      message: 'تم العثور على ' + guilds.length + ' سيرفر'
    });

    client.destroy();

  } catch (error) {
    console.log('❌ Error:', error.message);
    res.json({
      success: false,
      error: 'التوكن غير صالح: ' + error.message
    });
  }
});

// 🔥 طريق الحصول على الرتب
app.post('/api/get-roles', async (req, res) => {
  console.log('📨 Received get-roles request');
  
  try {
    const { botToken, guildId } = req.body;

    if (!botToken || !guildId) {
      return res.json({ 
        success: false, 
        error: 'التوكن والسيرفر مطلوبان' 
      });
    }

    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
    });

    await client.login(botToken);
    console.log('✅ Logged in as:', client.user?.tag || 'Unknown');

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error('السيرفر غير موجود');
    }

    await guild.members.fetch();
    
    const roles = guild.roles.cache
      .filter(role => !role.managed && role.name !== '@everyone')
      .map(role => ({
        id: role.id,
        name: role.name
      }));

    console.log('🎯 Found ' + roles.length + ' roles');

    res.json({
      success: true,
      roles: roles,
      message: 'تم العثور على ' + roles.length + ' رتبة'
    });

    client.destroy();

  } catch (error) {
    console.log('❌ Error:', error.message);
    res.json({
      success: false,
      error: 'فشل في جلب الرتب: ' + error.message
    });
  }
});

// 🔥 طريق إرسال الرسائل
app.post('/api/send-messages', async (req, res) => {
  console.log('📨 Received send-messages request');
  
  try {
    const { botToken, message, delay, guildId, roleId } = req.body;

    if (!botToken || !message || !guildId) {
      return res.json({ 
        success: false, 
        error: 'التوكن والرسالة والسيرفر مطلوبان' 
      });
    }

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
      ]
    });

    await client.login(botToken);
    console.log('✅ Logged in as:', client.user?.tag || 'Unknown');

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error('السيرفر غير موجود');
    }

    await guild.members.fetch();
    
    let members = guild.members.cache.filter(member => 
      !member.user?.bot && member.user?.id !== client.user?.id
    );

    if (roleId && roleId !== 'all') {
      members = members.filter(member => 
        member.roles?.cache?.has(roleId)
      );
    }

    console.log('👥 Found ' + members.size + ' members after filtering');

    const results = {
      sent: 0,
      failed: 0,
      total: members.size,
      guildName: guild.name
    };

    for (const member of members.values()) {
      try {
        if (member.user) {
          const dmChannel = await member.user.createDM();
          await dmChannel.send(message);
          results.sent++;
          console.log('✅ Sent to ' + (member.user?.tag || 'Unknown User'));
        }
      } catch (error) {
        results.failed++;
        console.log('❌ Failed to send: ' + error.message);
      }

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    }

    res.json({
      success: true,
      results: results,
      message: 'تم إرسال ' + results.sent + ' من ' + results.total + ' رسالة'
    });

    client.destroy();

  } catch (error) {
    console.log('❌ Error:', error.message);
    res.json({
      success: false,
      error: 'فشل الإرسال: ' + error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Server running on port ' + PORT);
});
