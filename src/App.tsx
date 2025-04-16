import { useEffect, useState } from "react";

type Offer = {
  description: RTCSessionDescription | null;
  iceCandidates: RTCIceCandidate[];
};

const { connection } = createConnection();

await connection.setLocalDescription();
const iceCandidates = await gatherICECandidates(connection);

export function App() {
  const [localOffer, setLocalOffer] = useState<Offer>({
    description: connection.localDescription,
    iceCandidates,
  });
  const [remoteOffer, setRemoteOffer] = useState<Offer>();
  const [channel, setChannel] = useState<RTCDataChannel>();

  useEffect(() => {
    const setDataChannel = (e: RTCDataChannelEvent) => setChannel(e.channel);
    connection.addEventListener("datachannel", setDataChannel);
    return () => {
      connection.removeEventListener("datachannel", setDataChannel);
    };
  }, []);

  useEffect(() => {
    const logEvent = (e: Event) => console.log(e.type, e);

    channel?.addEventListener("bufferedamountlow", logEvent);
    channel?.addEventListener("close", logEvent);
    channel?.addEventListener("closing", logEvent);
    channel?.addEventListener("error", logEvent);
    channel?.addEventListener("message", logEvent);
    channel?.addEventListener("open", logEvent);

    return () => {
      channel?.removeEventListener("bufferedamountlow", logEvent);
      channel?.removeEventListener("close", logEvent);
      channel?.removeEventListener("closing", logEvent);
      channel?.removeEventListener("error", logEvent);
      channel?.removeEventListener("message", logEvent);
      channel?.removeEventListener("open", logEvent);
    };
  }, [channel]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        gap: "12px",
      }}
    >
      <h1>P2P Sandbox</h1>
      {!channel ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <textarea
            rows={10}
            cols={120}
            readOnly
            style={{ resize: "none", textWrap: "nowrap" }}
            value={JSON.stringify(localOffer, undefined, 2)}
          />
          <textarea
            rows={10}
            cols={120}
            style={{ resize: "none", textWrap: "nowrap" }}
            value={JSON.stringify(remoteOffer, undefined, 2)}
            onChange={async (e) => {
              try {
                const remoteOffer: Offer = JSON.parse(e.target.value);
                assert(remoteOffer);
                assert(remoteOffer.description && typeof remoteOffer.description === "object");
                assert(Array.isArray(remoteOffer.iceCandidates));

                await connection.setRemoteDescription(remoteOffer.description);
                setRemoteOffer(remoteOffer);

                if (remoteOffer.description.type === "offer") {
                  await connection.setLocalDescription();
                  for (const candidate of remoteOffer.iceCandidates) {
                    await connection.addIceCandidate(candidate);
                  }
                  const iceCandidates = await gatherICECandidates(connection);
                  setLocalOffer({
                    description: connection.localDescription,
                    iceCandidates,
                  });
                }
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function createConnection() {
  const connection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  connection.addEventListener("connectionstatechange", (e) =>
    console.log("connectionstatechange", e.target.connectionState, e)
  );
  connection.addEventListener("datachannel", (e) => console.log("datachannel", e));
  connection.addEventListener("icecandidate", (e) => console.log("icecandidate", e));
  connection.addEventListener("icecandidateerror", (e) => console.log("icecandidateerror", e));
  connection.addEventListener("iceconnectionstatechange", (e) =>
    console.log("iceconnectionstatechange", e.target.iceConnectionState, e)
  );
  connection.addEventListener("icegatheringstatechange", (e) =>
    console.log("icegatheringstatechange", e.target.iceGatheringState, e)
  );
  connection.addEventListener("negotiationneeded", (e) => console.log("negotiationneeded", e));
  connection.addEventListener("signalingstatechange", (e) =>
    console.log("signalingstatechange", e.target.signalingState, e)
  );
  connection.addEventListener("track", (e) => console.log("track", e));

  const channel = connection.createDataChannel("chat");
  channel.addEventListener("bufferedamountlow", (e) => console.log("bufferedamountlow", e));
  channel.addEventListener("close", (e) => console.log("close", e));
  channel.addEventListener("closing", (e) => console.log("closing", e));
  channel.addEventListener("error", (e) => console.log("error", e));
  channel.addEventListener("message", (e) => console.log("message", e));
  channel.addEventListener("open", (e) => console.log("open", e));

  return { connection, channel };
}

function gatherICECandidates(connection: RTCPeerConnection) {
  return new Promise<RTCIceCandidate[]>((resolve, reject) => {
    const candidates: RTCIceCandidate[] = [];

    connection.addEventListener("icecandidate", (e) => {
      if (e.candidate !== null) {
        candidates.push(e.candidate);
      }

      if (e.target.iceGatheringState === "complete") {
        resolve(candidates);
      }
    });

    setTimeout(() => reject(new Error("Gather ICE candidates timeout")), 1000);
  });
}

function assert(value: unknown, msg?: string): asserts value {
  if (!value) {
    throw new Error(msg);
  }
}
