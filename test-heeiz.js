import fetch from 'node-fetch';

async function test() {
  const token = "79vznsrIc31HSHPhcJIOGYRIUG8QMp7PfNgUqQrAu6pPuCOgcIGE9KSFoh5sXXtpKlVF9o1Iq15h9M4nFZDFXAMO5OOK3AwfcA2ZUE0T5DKazcWJ9gWCExj8q425p3VvD4wtXMkaesthLMIFJA8nnlg46oi5XcqyJ0hGJqlWub0j7t7Faxfuo2ZQ363z8jT8EKD6prg30QiaPrCTuDxGreK8b48oVvgliZh5ekTNoxPt5NnCFTMkpn8405tAzFN12H2ZdUjQJEp665Mk7I0HXj9GoJFYyM81ZhLiNCpz4qobS0Z6ossN0xXhuJnRPzMEqKvxmUNgOTvnJqw8mrrD8vxFfGkWLeBHxf30EIllAmYT0DmwX5k08Kci8lYSnJo6CNMaykU4zpyHnufzCg0UY2XY2yBA9yXmZfncMMXv1xqf7mwfQL9ymYovwidFOx5RAkFl3QlCQlNd7J5e6zF1911bgjJAr2wDinGD7uz2htL40GhIeE8U7e6df105";
  
  try {
    const res = await fetch("https://api.heeiz.net/api/v1/external/orders", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    const data = await res.text();
    console.log("GET /orders:", data);
  } catch (e) {
    console.error(e);
  }
}

test();
