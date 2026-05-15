Notched Therapy for Tinnitus
============================

I'm a long time sufferer of tinnitus - even as I write this it rings away in my head. I found [research](http://www.ncbi.nlm.nih.gov/pmc/articles/PMC2918775/pdf/cib0303_0274.pdf) performed in the last few years that tells of a study performed with tinnitus sufferers and "notched music therapy". 

Often the sites that would help create notched music required some payment (that I personally didn't find was justified). Notched music can also be created using Audacity, but I knew with the new WebAudio API it could be done in the browser. So this is my attempt.

## Project Status

Currently the project is just a bit of the client side, which I've hosted, or you can try out on using a [5minfork](http://5minfork.com/remy/tinnitus/) of this repo (make sure to navigate to public directory).

However, I do intend to flesh out the server side so the app can **freely provide**:

- Match and find the pitch of your tinnitus ✔
- Play white noise with your pitch notched out ✔
- Upload (via drag and drop) your own mp3 files and notch ✔
- Recording of tinnitus pitch over time
- Export white noise as wav (done in client side)
- Export white noise as mp3 (done using round trip to server)
- Upload a zip file of mp3 files to notch
- Export (as a zip or individual files) of notched mp3 files (also requires trip to server)

*More details to come as I continue to develop this.*


The Application
===============

Find Tab

Use the Find tab to determine your tinnitus frequency.
Use the Gain to and your computers volume to set the sound so that it is just below your own tinnitus volume.
Play with the frequency until the sounds more of less cancel out each other.
Now you have your tinnitus frequency.

Notch Tab

The Notch tab will play White Noise, but it will notch around your tinnitus frequency.

Tailor-Made Notched Music Training (TMNMT):

    The "tailor-made" part refers to the fact that the notch is customised to
    each individual's specific tinnitus frequency — unlike generic broadband
    noise therapies, the notch is tuned precisely to the frequency the patient
    perceives their tinnitus at. That's exactly what the "Find" tab is for.

Based on the research behind Notched Music Training (TMNMT):

    The mechanism: The auditory cortex uses lateral inhibition — neurons tuned
    to one frequency actively suppress activity in neighbouring neurons. When
    you repeatedly stimulate the frequencies around your tinnitus frequency but
    not the tinnitus frequency itself, the lateral inhibition from those
    surrounding frequencies suppresses the over-active neurons responsible for
    generating the tinnitus perception.

What the therapy does:

    - You listen to audio (music or noise) with a notch cut out at your
      tinnitus frequency
    - The frequencies on either side of the notch are present and stimulate
      neurons neighbouring your tinnitus frequency 
    - Those neighbouring neurons fire and laterally inhibit the
      tinnitus-frequency neurons
    - Over weeks/months of regular listening, the tinnitus-frequency neurons
      become less excitable The perceived loudness and intrusiveness of the
      tinnitus decreases

What it does NOT do:
    - It does not cure tinnitus
    - It does not work on the ear itself — it works on the brain's auditory
      cortex
    - Results are gradual — studies showed modest but statistically significant
      reductions after 3-12 months of daily listening

The notch width matters: The notch should be about one octave wide centred on
the tinnitus frequency — half an octave below and half an octave above. That is
what centreFreq() is approximating with the / 1.41 (which is √2, i.e. half an
octave down).
