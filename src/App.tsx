import { useEffect, useState } from "react";

type Offer = {
  description: RTCSessionDescription | null;
  iceCandidates: RTCIceCandidate[];
};

const { connection, channel: initialChannel } = createConnection();

export function App() {
  const [connectionState, setConnectionState] = useState(connection.connectionState);
  const [localOffer, setLocalOffer] = useState<Offer>();
  const [remoteOffer, setRemoteOffer] = useState<Offer>();

  const [channel, setChannel] = useState<RTCDataChannel>();
  const [localMessages, setLocalMessages] = useState<string>("");
  const [remoteMessages, setRemoteMessages] = useState<string>("");

  useEffect(() => {
    // @ts-expect-error Untyped event
    const updateConnectionState = (e: Event) => setConnectionState(e.target.connectionState);
    connection.addEventListener("connectionstatechange", updateConnectionState);

    return () => {
      connection.removeEventListener("connectionstatechange", updateConnectionState);
    };
  }, []);

  useEffect(() => {
    (async () => {
      await connection.setLocalDescription();
      const iceCandidates = await gatherICECandidates(connection);
      setLocalOffer({ description: connection.localDescription, iceCandidates });
    })();
  }, []);

  useEffect(() => {
    const setDataChannel = (e: RTCDataChannelEvent) => setChannel(e.channel);
    connection.addEventListener("datachannel", setDataChannel);
    return () => {
      connection.removeEventListener("datachannel", setDataChannel);
    };
  }, []);

  useEffect(() => {
    const updateRemoteMessages = (e: MessageEvent) => setRemoteMessages(e.data);
    channel?.addEventListener("message", updateRemoteMessages);
    return () => {
      channel?.removeEventListener("message", updateRemoteMessages);
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "820px",
          maxWidth: "95%",
        }}
      >
        <p>Connection state: {connectionState}</p>

        {connectionState !== "connected" ? (
          <>
            <textarea
              rows={10}
              readOnly
              style={{ resize: "none", textWrap: "nowrap" }}
              value={JSON.stringify(localOffer, undefined, 2)}
            />
            <textarea
              rows={10}
              style={{ resize: "none", textWrap: "nowrap" }}
              value={JSON.stringify(remoteOffer, undefined, 2)}
              onChange={async (e) => {
                try {
                  const remoteOffer: Offer = JSON.parse(e.target.value);
                  assert(remoteOffer);
                  assert(remoteOffer.description && typeof remoteOffer.description === "object");
                  assert(Array.isArray(remoteOffer.iceCandidates));

                  setRemoteOffer(remoteOffer);
                  await connection.setRemoteDescription(remoteOffer.description);
                  for (const candidate of remoteOffer.iceCandidates) {
                    await connection.addIceCandidate(candidate);
                  }

                  if (remoteOffer.description.type === "offer") {
                    await connection.setLocalDescription();
                    const iceCandidates = await gatherICECandidates(connection);
                    setLocalOffer({
                      description: connection.localDescription,
                      iceCandidates,
                    });
                  }
                } catch (e) {
                  console.error(e);
                  setRemoteOffer(undefined);
                }
              }}
            />
          </>
        ) : (
          <>
            <textarea
              rows={10}
              readOnly
              style={{ resize: "none", textWrap: "nowrap" }}
              value={remoteMessages}
            />
            <textarea
              rows={10}
              style={{ resize: "none", textWrap: "nowrap" }}
              value={localMessages}
              onChange={(e) => {
                setLocalMessages(e.target.value);
                initialChannel.send(e.target.value);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function createConnection() {
  const connection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  connection.addEventListener("connectionstatechange", (e) =>
    // @ts-expect-error Untyped event
    console.log("connectionstatechange", e.target.connectionState, e)
  );
  connection.addEventListener("datachannel", (e) => console.log("datachannel", e));
  connection.addEventListener("icecandidate", (e) => console.log("icecandidate", e));
  connection.addEventListener("icecandidateerror", (e) => console.log("icecandidateerror", e));
  connection.addEventListener("iceconnectionstatechange", (e) =>
    // @ts-expect-error Untyped event
    console.log("iceconnectionstatechange", e.target.iceConnectionState, e)
  );
  connection.addEventListener("icegatheringstatechange", (e) =>
    // @ts-expect-error Untyped event
    console.log("icegatheringstatechange", e.target.iceGatheringState, e)
  );
  connection.addEventListener("negotiationneeded", (e) => console.log("negotiationneeded", e));
  connection.addEventListener("signalingstatechange", (e) =>
    // @ts-expect-error Untyped event
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

      // @ts-expect-error Untyped event
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
