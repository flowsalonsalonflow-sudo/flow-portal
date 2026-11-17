const https = require('https');
https.get('https://script.google.com/macros/s/AKfycbzL5n4xN2c_1e2uA-3mJp3o395i9Vf371Fz6F2xG3n0n8nJk-6x6H0O6oR4n_4yR8tA/exec?api=get_initial_data&email=flowsalon.salonflow@gmail.com', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    let parsed = JSON.parse(data);
    console.log("tugasDef:", parsed.tugasDef);
    console.log("userProfile:", parsed.userProfile);
  });
});
