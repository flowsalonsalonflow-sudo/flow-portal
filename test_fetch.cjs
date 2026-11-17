const https = require('https');
const url = 'https://script.google.com/macros/s/AKfycbzAv_xYB_2g1QTx7gPnQXwcd7QB1VclpWSIjtcXk9QTX_M65mnoxWZ2H_6AeGUBzN7l/exec?action=get_initial_data&email=flowsalon.salonflow@gmail.com';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      let parsed = JSON.parse(data);
      console.log("tugasDef count:", parsed.tugasDef ? parsed.tugasDef.length : 0);
      if (parsed.tugasDef && parsed.tugasDef.length > 0) {
        console.log("Sample tugasDef item:", parsed.tugasDef[0]);
      } else {
        console.log("tugasDef:", parsed.tugasDef);
      }
      console.log("userProfile:", parsed.userProfile);
    } catch(e) {
      console.log(data);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
