import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Razorpay Script for Live Booking */}
        <script
          src="https://checkout.razorpay.com/v1/checkout.js"
          async
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
