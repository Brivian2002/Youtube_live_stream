const CLIENT_ID =
  "624184946172-qbqhl2e8a8c83ho6hmsmkoerpfslpi97.apps.googleusercontent.com";
const CLIENT_SECRET = "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"; // DO NOT expose this publicly
const API_KEY = "AIzaSyA3NsZQbkonBdQXIL9GLd0duQf_a6ukAL4";
const redirect_uri = "https://youtubelivebot.netlify.app/oauth2callback"; // Redirect URI from Google OAuth

let authToken;

// Sign in with YouTube OAuth
document.getElementById("signin-button").addEventListener("click", () => {
  const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirect_uri
  )}&response_type=token&scope=https://www.googleapis.com/auth/youtube.force-ssl`;

  window.location.href = authUrl; // Redirect user to Google OAuth
});

// Handle OAuth Callback
function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  if (urlParams.has("access_token")) {
    authToken = urlParams.get("access_token");
    console.log("Authenticated! Token:", authToken);
  }
}

// Run this function when the page loads
window.onload = () => {
  if (window.location.pathname.includes("/oauthcallback")) {
    handleOAuthCallback(); // Handle OAuth response
  }
};

// Create and Schedule Live Stream
document
  .getElementById("create-live-stream-button")
  .addEventListener("click", async () => {
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const scheduledStartTime = document.getElementById("scheduledStartTime")
      .value;
    const videoFile = document.getElementById("video-file").files[0];

    if (!title || !description || !scheduledStartTime || !videoFile) {
      alert("Please fill in all fields and select a video.");
      return;
    }

    // Step 1: Create the Live Broadcast
    try {
      gapi.load("client", async () => {
        await gapi.client.load("youtube", "v3");
        gapi.client.setToken({ access_token: authToken });

        const broadcastResponse = await gapi.client.youtube.liveBroadcasts.insert(
          {
            part: "snippet,contentDetails,status",
            resource: {
              snippet: {
                title: title,
                description: description,
                scheduledStartTime: new Date(scheduledStartTime).toISOString()
              },
              status: {
                privacyStatus: "public"
              },
              contentDetails: {
                enableAutoStart: true
              }
            }
          }
        );

        const broadcast = broadcastResponse.result;
        console.log("Live Broadcast Created:", broadcast);
        displayLiveStreamInfo(broadcast);

        // Step 2: Upload the Prerecorded Video
        await uploadVideo(videoFile, broadcast.id);
      });
    } catch (error) {
      console.error("Error creating live stream:", error);
    }
  });

// Upload Video to YouTube
async function uploadVideo(videoFile, broadcastId) {
  const formData = new FormData();
  formData.append("videoFile", videoFile);

  try {
    const response = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status,contentDetails`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          snippet: {
            title: videoFile.name,
            description: "Scheduled Live Stream",
            categoryId: "22"
          },
          status: {
            privacyStatus: "private"
          }
        })
      }
    );

    const videoData = await response.json();
    console.log("Video Uploaded:", videoData);

    // Associate Video with Live Stream
    await gapi.client.youtube.liveBroadcasts.bind({
      id: broadcastId,
      part: "id,contentDetails",
      streamId: videoData.id
    });

    console.log("Video bound to live stream successfully!");
  } catch (error) {
    console.error("Error uploading video:", error);
  }
}

// Display Live Stream Info
function displayLiveStreamInfo(broadcast) {
  document.getElementById("live-stream-info").innerHTML = `
        <h3>Live Stream Created</h3>
        <p><strong>Broadcast ID:</strong> ${broadcast.id}</p>
        <p><strong>Title:</strong> ${broadcast.snippet.title}</p>
        <p><strong>Scheduled Start Time:</strong> ${broadcast.snippet.scheduledStartTime}</p>
        <p><a href="https://www.youtube.com/live_dashboard" target="_blank">Manage Live Stream</a></p>
    `;
}
