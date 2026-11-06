const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NailsNow - Stripe Setup</title>
</head>
<body style="font-family:Arial,sans-serif;text-align:center;padding:40px">
  <h2>Return to NailsNow</h2>
  <p>You can return to the app to check your payment setup.</p>
  <a href="nailsnowmobile://stripe-return"
     style="display:inline-block;padding:14px 24px;background:#d946a6;color:white;text-decoration:none;border-radius:10px">
    Open NailsNow
  </a>
</body>
</html>`;

Deno.serve((_request: Request) => {
  return new Response(html, {
    status: 200,
  headers: {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
},
  });
});