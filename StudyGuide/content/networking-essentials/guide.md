# Networking Essentials for System Design Interviews

## Overview

Networking is fundamental to system design interviews. Understanding the layered model, key protocols, load balancing strategies, and failure handling patterns will prepare you for 90% of networking questions in interviews.

This guide is based on the "Networking Essentials" core concept video from Hello Interview, covering the four main sections: basics and OSI model, protocols at each layer, load balancing, and practical deep dives.

---

## 1. The OSI Model & Layered Networking

Networking is usually thought of as a **layered cake**, where at the top are application layer protocols like HTTP and WebSockets, and at the bottom are physical layer elements like wires in a network. When we're talking in system design interviews, we're usually only concerned with a few of these layers, but it's important that you understand these layers and how they operate.

They're basically like **abstractions**. Recall that when you're building an app, you're probably not moving voltages around to write to a disk — you're probably using an open command and a write command, and that enables you to think about the important pieces, like what your data looks like, as opposed to the mechanics of the underlying hardware. Networking works in much the same way.

These layers build upon one another and provide features and functionalities that you'll need.

### The Three Layers We Care About

| Layer | Name | Protocols | What It Does |
|-------|------|-----------|--------------|
| 7 | Application | HTTP, WebSockets, SSE, gRPC, GraphQL, WebRTC | **Primary focus** — useful to you as a developer |
| 4 | Transport | TCP, UDP, QUIC | Additional functionality on top of IP: guaranteed ordering, reliable delivery |
| 3 | Network | IP (IPv4/IPv6), InfiniBand | Gives names usable to nodes, allows routing |

The vast majority of applications outside of AI labs will use IP or internet protocol.

**Key Insight**: Layers are abstractions. HTTP depends on TCP, which depends on IP. Each layer is oblivious to details below it.

### Two Critical Implications

1. **Latency from handshakes** — There is a lot of back and forth, and that means latency when we're setting up and initializing connections.

2. **Connection state** — We have a connection established and a connection that's terminated, and that connection is not incredibly cheap for us to set up. There's actually a lot of latency and back and forth, and we'll need to be considerate of how we manage that state throughout the rest of our design.

### Working Through an Example: HTTP Request

When we want to make an HTTP request, we want to make a web server request to a website, we're actually going to transmit a lot of different information between client and server.

As an example, when the TCP connection is initially established, we're going to use what's called a **three-way handshake**. There's going to be a synchronize, an acknowledgment of that synchronization, an acknowledgment of that acknowledgment, and then, and only then, is our connection established.

After that, we can go and submit requests over that connection or that TCP stream, and then we're going to get responses back from the client.

What you can see here is that these layers are building on one another. The HTTP layer depends on the TCP layer or the TCP connection being established, and the TCP layer assumes that it can depend on using IP addresses to route packets through the network.

So the central idea here is that these layers help each other, and they also are oblivious to some of the details of the protocols that live below them.

---

## 2. Layer 3: Internet Protocol (IP)

We're going to start with the lowest layer, the network layer, at layer three. And at this layer is **internet protocol or IP**.

The responsibility for IP is basically to give names that are usable to nodes on the network, and allow routing.

### Address Types

We have two types of names:
- **IPv4 addresses** — four bytes, you can see this in this notation (e.g., `192.168.0.1`)
- **IPv6 addresses** — 16 bytes. They're actually arranged in two byte pairs.

The main difference for these is that we've run out of IPv4 addresses, and we haven't out of IPv6.

You'll typically use **IPv4 externally** because it's going to be more compatible, and then **IPv6 internally** because it's more modern.

### Public vs Private Addresses

IP addresses come in two forms, public addresses and private addresses.

**Public addresses** are known to the world. They're assigned by a central body, and routers are aware of them.

As an example, this is the range of addresses that Apple owns. All addresses that start with 18 — this notation means the first eight bits of the address are meaningful, that is the first byte or that 18. All of the addresses that start with 18 belong to Apple.

And so what that means for routing infrastructure on the internet is: If you see an IP address with 18, you can send it over to the routers that Apple owns.

**Private IP addresses** — you can assign your nodes any name you want. The only important thing here is that you remember where they are and that your routers are aware of them.

An example of a private IP address is `192.168.0.1`. It's probably the address of your home router.

This is actually a special range, this `192.168`, you'll see `16`, so the first two bytes, that's allocated for local networks.

And the whole point is to eliminate any overlap between private addresses and public addresses. What you don't want to do is give your toaster an IP address that also is used by Google, and then when you want to go and send a packet over to Google, it actually goes to your toaster.

**Private Ranges** (RFC 1918):
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16` (home routers)

### System Design Interview Usage

For system design interviews, you're going to see these public and private addresses in two places:

- **Public addresses** are usually used for your API gateway, for load balancers, for externally facing components of your design. The key thing here is that people on the outside world need to be able to send them information.

- **Private IP addresses** are going to be used for everything else, all of your microservices, any other internal hosts, and you need to both allocate them and be aware of them.

So if you're going to load balance between IP addresses, you've got to keep track of which hosts exist, where they are, and which ones you want to use.

---

## 3. Layer 4: Transport Protocols

The next layer of the cake is layer four, or the **transport layer**.

With IP addresses in hand, I can send big packets or, you know, like a block of binary data to a host, but I'm usually missing two things:

1. **Context** — I oftentimes care about, like, what application it's both destined for and came from. This is usually solved with **ports**.
2. **Ordering and delivery** — I care about the ordering of packets and whether or not they were delivered. These functionalities aren't provided by IP natively, but they are provided by some transport protocols.

There's really three protocols that have been widespread use today: **TCP, UDP, and QUIC**. QUIC is a more modern substitute for TCP. It's increasingly being used for web traffic, and it has a lot higher performance, but it looks very similar in terms of functionality. So I'm going to ignore it for a minute to focus primarily on TCP and UDP.

### TCP (The Default)

TCP is the default. If you are talking about system design, your interviewer is generally going to assume you're talking about TCP because as application developers, you're usually relying on TCP for most of your communications.

TCP is going to give you some additional features on top of IP, like **guaranteed delivery and ordering**.

The way that this works is when you initially establish a TCP connection or stream, you're basically saying, I've got a sequence, and you're going to be giving packets a sequence number.

Then as packets go across the network, if they get out of order or they're lost, both the sender and the recipient will know what happened in between. They've got the numbers to back it up.

So if you had packets one and three, you might be able to assume that two was missing, and you could go back to the transmitting server and say, "I lost two."

Also, if you got five after you had just gotten three, you're going to wait a second for four before you emit five to your application.

That's functionally how TCP works.

Now, TCP is awesome, and it's the default because it's reliable. The hardest part about networking is that if the network fails to transmit or things are lost in the transmission process, it can be hard to deal with failures, and TCP mitigates many of those failures.

But note that while I can guarantee delivery in one sense, like I'll know whether a packet was actually received by the other host, I can't really guarantee delivery in an absolute sense at just the network level. This isn't going to tell me, for instance, if the data was written to disk. It's not really relevant for things like CAP theorem, but it is relevant from a practical standpoint about giving you an insight into what actually happened on the other end of the network.

**Trade-off**: While all these guarantees that TCP offers are amazing, they have cost, and their primary cost is in throughput and in latency. If, for instance, a packet is lost in transmission, TCP needs to retransmit it before it can continue. And if your two hosts are very far apart, that retransmission can take up a lot of time.

There are going to be applications where you don't need those guarantees and you want higher performance. That's where UDP comes in.

### UDP (Specialized Use)

You can think of UDP like a machine gun. It's basically **spray and pray**.

As a sender, you're going to write your data, you're going to wish it, you know, a good voyage, and you're going to send it off across the ocean and hope it makes it there. And in most cases, it will, and in some cases it won't.

Now, that kind of seems like it sucks, and it kind of seems like wishful thinking, but it actually turns out to be really useful in some applications.

As an example, when you were doing video conferencing, you don't want to, if you drop a frame, to go back to the host and say, "hey, give me that frame again." What you'll usually do is just drop that frame out of the view, you might stabilize the audio a bit, and you'll keep going.

That's not to say that you won't go back to the sender at any point and send them a message to say, "hey, you're dropping the connection, can you lower the transmission rate?" But it is to say that you don't care as much about those individual packets.

So UDP is going to be really useful for real-time applications or for lossy applications: multiplayer games, audio and video conferencing, sometimes live stream.

In system design interviews, you may be forced to choose between TCP and UDP, and your default should definitely be TCP.

The cases where you're going to want to use UDP are those where **latency is paramount**, and you can handle those failure modes where a packet is missing or you get things out of order. If those two things hold, then moving to a UDP-oriented service can be really useful.

**Caveat**: UDP isn't supported by browsers natively. So if you have any browser applications, you're going to need to figure out a TCP version to use alongside whatever UDP applications, like a mobile app, might be using your service.

### QUIC (Modern Alternative)

- Built on UDP, replaces TCP for web traffic
- Higher performance, similar guarantees
- Increasingly used (HTTP/3)

---

## 4. Layer 7: Application Protocols

Now that we've covered layer three and layer four, TCP, UDP, and IP, we can graduate ourselves to layer seven, the application layer, where we'll be spending the majority of our time.

### HTTP / REST (Default Recommendation)

The first protocol at the application layer is **HTTP, hypertext transfer protocol**, and it is the most popular protocol for a lot of applications. And it's not just websites. Even RPC or remote procedure call applications will use HTTP because it's very versatile and it's battle tested over decades.

The way HTTP works is **simple text formatted requests and responses**.

A request looks like this:
```
GET /posts/1 HTTP/1.1
Host: api.example.com
Accept: application/json
```

This GET is actually called the **method or an HTTP verb**, and it tells me a little bit about my intent. Am I modifying data? Am I retrieving it? Am I updating it?

The **headers** are a key value dictionary, and they can really contain almost anything. The HTTP standard has a bunch of headers that are widely accepted, like content encoding or accept encoding, but you're also free to define your own headers that you can use at will in your application.

The HTTP response is going to include both the actual data that we want to transmit, but also a **status code**, which tells me was it successful or not, and some headers, which might indicate what format the data is in or the date that it was retrieved.

#### Content Negotiation

One of the more important ideas behind HTTP is called **content negotiation**. When I make a request, I might tell the web server that I'm requesting it from what kind of things I can receive. I can accept compressed content, or I can accept certain encodings.

Then in the response, the server's free to tell me what it actually gave me. "I gave you compressed content," or "you asked for compressed content, but I don't have it. I'm going to give you plain text content."

This makes HTTP both backwards and forwards compatible. When new versions and new functionality are rolled out, new headers are introduced, and then servers and clients are able to negotiate what they want to use and what they don't want to use.

#### REST (Representational State Transfer)

The name hypertext transport protocol might be a little bit misleading because it kind of makes the assumption that we're just retrieving web pages. But HTTP is much broader than that, and it can be used for building APIs, as an example.

The most common way to build APIs on top of HTTP is using what's called **REST, or representational state transfer**.

The way that REST works is two pieces:
1. We're going to use those HTTP methods or verbs to describe what operations we're doing. Are we reading data? Are we writing data? Are we updating data?
2. And secondly, we're going to focus on **resources**, and those resources are going to have URLs associated with them.

**Examples:**

- **Read user ID 1**: `GET /user/1` → returns JSON with user details
- **Update user**: `PUT /user/1` with body `{username: "John Doe", email: "john@example.com"}`
- **Create user**: `POST /users` with body `{username: "Stefan May", email: "stefan@hellointerview.com"}`
- **Nested resources**: `GET /user/1/posts` — list of posts for user 1

**REST Principles:**
- Organize around **resources** (nouns), not actions (verbs)
- ❌ `/updateUser` → ✅ `PUT /users/1`
- This organization can be a little counterintuitive to some developers because they're used to thinking in terms of function calls
- Operations that you might think of as mutations become updates to resources
  - Example: Start a game → `PATCH /games/1 {status: "running"}`

REST is very popular, and it is in some sense the default that we would suggest for how you build APIs in system design. There is some overhead, and there's certainly some thinking that you're going to have to do in order to make this work. But it has wide generality, everybody knows REST and is able to use it, and it's reasonably performant for most applications.

### GraphQL (Flexible Frontend)

Just like there were situations where we might want to move from the default of TCP to UDP for special applications, there are certainly instances where we might actually want to use a different protocol for our application layer.

One example of this is **GraphQL**.

In GraphQL, we're going to acknowledge some of the problems that exist with RESTful APIs and then provide an alternative for them.

**The Problem**: Let's pretend we are designing a mobile app, and we've got this view that shows some profile information, some status information, and a list of groups that this user is associated with. Whenever I open this page in a RESTful context, I need to make five or more requests to the server.

This is a problem because:
1. My page/screen is only going to be fully loaded as soon as all of these return
2. All of the overhead of establishing an HTTP request and serializing the information happens in each of these requests

This would be an example of **underfetching** — basically I'm not getting enough information in the response, and I've got to go and make other requests.

Similarly, I might try to solve this by creating a **kitchen sink endpoint** — `/everything-you-might-need` — that returns my entire database. I've solved underfetching, but now this request is really expensive and takes a long time (overfetching).

GraphQL is really trying to solve this problem that very frequently happens when we're developing apps or web pages, where our requirements are constantly changing. We might want to add a widget here or change fields here, and we don't necessarily want to have to change our APIs on the backend every time that happens. It's mostly a front-end concern.

**How GraphQL Works**: It basically provides a way for the front-end to describe the shape of data that it needs to retrieve, and then the back-end is then able to figure out where to get that data so that it can return it in the way the front-end needs.

```graphql
query GetUserWithProfile {
  user(id: "1") {
    id
    username
    profile { avatar, fullName }
    groups { name, description, category }
  }
}
```

The GraphQL response returns all of this data and nothing more. What GraphQL has done is instead of telling me about resources, I'm telling it exactly the view I want to materialize on the front end, and then the back end is free to figure out what details it needs in order to make this happen.

**Use When**:
- Your front end is changing all the time (experiments, requirements aren't firm)
- You've got lots of different teams (front-end needs to connect to multiple back-end teams with different APIs)

**In Interviews**: Both those situations actually don't happen as often in system design interviews. In a lot of cases, you're the sole author of your system, and the requirements are going to be fixed at the start of the interview.

GraphQL is really useful in interviews when:
- Interviewer isn't giving you all requirements or implying they'll change quickly
- You want to design a system that specifically supports arbitrary query patterns (e.g., newsfeed-style applications)

### gRPC (High-Performance Internal)

Another example of a protocol where we might want to move away from REST would be **gRPC or Google RPC**.

The way gRPC works, it's built on top of **protobufs**.

If you're not familiar with protobufs, they're pretty simple. They provide a schema, it looks like a struct if you've written C or C++. And that schema provides a way to serialize objects into very efficient binary representations.

A JSON blob might be 40 bytes, but in a protobuf representation, it's only 15 bytes — a massive savings. If my server is handling gigabytes of data, then I only have to use half of them.

gRPC builds on top of protobufs to add this notion of **services**.

```protobuf
message GetUserRequest { int32 id = 1; }
message GetUserResponse { string username = 1; string email = 2; }

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}
```

This will compile into stubs that can be used for a wide variety of languages, from Java and C++ to Node, Ruby, even some esoteric languages.

What gRPC does is it makes the serialization and deserialization of my inputs much more efficient. Whereas with REST, I was using JSON blobs, which actually need to be parsed. With gRPC, I don't have a lot of that overhead. And that means that gRPC services can be up to 10 times as efficient, 10 times as fast, or 10 times as much throughput as their REST equivalents.

gRPC also adds some additional features that are useful for operating microservices at scale, like **client-side load balancing** and **streaming** and some **rudimentary authentication**.

**The Main Problem with gRPC (twofold):**
1. Mostly external clients don't support gRPC — web browsers don't support gRPC natively
2. Operating with binaries in between services is really efficient and very effective for the servers, but it makes it harder for devs and other teams to be able to debug the information that is being passed over the wire

**Architecture Pattern**:
```
Client → [REST/HTTP] → API Gateway → [gRPC] → Internal Services
```

This is kind of the best of both worlds where I get high-performance interconnects for all of these hosts, but I get a language and a way of communicating with my clients that's widely accepted and easily debugged externally.

**In Interviews**: I wouldn't suggest bringing up gRPC unless you were tightly optimizing for performance. But in those cases, having a hybrid setup where you've got REST and HTTP and gRPC internally can be the best of both worlds.

### Server-Sent Events (SSE)

So far, we've mostly been talking about requests and responses, which is going to be the vast majority of applications that you're going to build. But there are a lot of applications where you want to be able to push data to your user as it's happening. Examples: stock ticker updates, notifications.

You can just poll the API to make repeated requests. But that means your information is going to be delayed by up to your polling frequency, and there is some overhead of repeatedly opening and closing connections or making those requests.

Enter **server sent events, or SSE**.

SSE is an extension on HTTP, so it's basically an HTTP request, but with one notable difference.

With a typical HTTP request, our response is going to be consumed almost wholly. In most cases for APIs, you can think that I'm not really going to be able to process the response until I get everything.

With SSE, what I'm going to do is include additional headers in the response, like chunked encoding, and then in the response, I'm going to use new lines to designate how each of the events are happening.

What will happen is when my first event comes, I'm going to pass it over the wire as part of the first line of that HTTP response. Because of the headers, all of the proxies and other things that are handing that request are going to send that response right onto my clients, and my clients are going to immediately start to parse the response.

What that means is that I basically have a way to **unidirectionally push notifications from server to client**.

The nice part about SSE is I can use the existing HTTP machinery. I don't need new infra in order to build out on top of SSE.

**Downside**: Those connections are going to be severed frequently. HTTP requests are expected to return in somewhere on the order of 30 seconds to one minute. Most routers and proxies are going to time out or disconnect requests that exist for longer than that.

What SSE will do in those cases is **automatically retry**. Most of the clients, like event source, will open up a new SSE connection. And what they'll do is they'll pass the ID of the last event that it received, just in case one event happened between the time that it was disconnected and the time that you reconnected.

But it's a bit of a kludge. You're basically existing on this connection that is constantly pushing responses that is periodically severed and then re-enabled. That said, just because it's kludge doesn't mean it doesn't work, and many applications can use SSE.

**Use For**:
- Great option if you need to get updates to a UI for a short period of time (e.g., buying a product, status evolving over 15 seconds)
- Really useful for AI applications where you might want to stream tokens or responses back to the user because they take a while (might take 30 seconds for full response)

### WebSockets (Bidirectional, Stateful)

SSE can be super powerful for those push notifications, but in some instances, we actually need **bidirectional communication**. Our clients need to be pushing to the server in as much as the server needs to be pushing to the client, and we care a lot about latency.

In those cases where we have **high frequency updates and bidirectional communication**, that's where we're going to bring in **WebSockets**.

**Caveat**: I oftentimes see candidates use these inappropriately. WebSockets are really powerful, but they also require a lot of infra, and it may be more appropriate to think about a polling-based solution or an SSE-based solution before you launch into a full-tilt WebSocket solution, especially if the functionality that you're designing is pretty narrow.

Like getting an update on a bid for just a general browser of the page. That probably doesn't mean you want to open millions of WebSocket connections. But where you need WebSockets, they are going to be very powerful.

**How WebSockets Work**: Basically by simulating a TCP connection, but by making it accessible for browsers and other clients. A WebSocket is basically just a way for you to exchange binary blobs that come in on the same order and are in some sense guaranteed to be delivered reliably.

When you design WebSockets in a system design interview, you're typically going to talk about an API in terms of **messages that you're sending**. Because these aren't request and response, you don't typically have that function style setup where you can say, here's the input and here's the output.

Instead, you'll say, "hey, I'm going to receive a ticker update notification to my client. And then on my client, I might send a subscribe or an unsubscribe."

**Stateful Nature**: WebSockets in general are going to involve a lot of state for your application. If you've got a WebSocket connection, that means that connection needs to be active for as long as the lifetime of that WebSocket connection. If I have a WebSocket connection to a server and that user is going to be around for an hour, I need a way of keeping that server alive for as long as that connection needs to be alive.

This can really play havoc on applications where you want to do deployments or you might have failures.

**Architecture Pattern**:
```
Clients → [WebSocket] → Message Broker/Notification Service → [REST/gRPC] → Internal Services
```

You might call it a message broker or a notification service, but essentially you'll have all of your users connect via WebSockets to that service, and then that service will make requests to your internal services, and those internal service will then send messages back via WebSockets.

### WebRTC (Peer-to-Peer, UDP-based)

The final protocol that we're going to talk about is **WebRTC**, and this is by far the most unique and the most niche protocol of the group.

WebRTC, unlike all the other protocols, **runs over UDP as opposed to TCP**, and it's really used in those places where you either have collaborative editors or you have audio and video connections between clients.

WebRTC is unique because it's a **peer-to-peer connection**. WebRTC is a way for clients to connect with one another, which makes sense if you think about video conferencing or collaborative editors.

**How It Works** (simplified):
1. Clients connect to a **signaling server** — centralized server that maintains knowledge about all clients and exchanges information (doesn't handle video feeds)
2. Client learns about peers and decides which to connect to
3. Connect to a **STUN server** — most clients don't accept inbound connections (security). STUN helps with NAT hole punching to find an address peers can connect to
4. Share information between peers so they can connect directly
5. Send information over UDP connection (video conferencing happens here)
6. **Fallback**: If P2P fails, use a **TURN server** — centralized relay (least efficient, least desirable)

WebRTC sounds pretty seductive because peer-to-peer seems like it could be really powerful, and it can for the right application. But a lot of candidates in system design interviews use it unnecessarily, so I would generally avoid it except if you're doing audio and video calling, in which case it might be worth bringing up.

The other use case that's acceptable is **collaborative editors**. You might use a peer-to-peer connection to exchange updates on a shared document, and you would probably use **CRDTs (conflict-free replicated data types)** to share document state in a way that is amenable to peer-to-peer connection.

If that sounds confusing, you should totally ignore it because it is, while an awesome design, also probably not necessary for 95+ percent of interviews.

**For WebRTC**: Think about it as when you need to facilitate audio and video calling.

---

## 5. Load Balancing

We've got a lot of protocols. In system design interviews, you're usually going to be scaling. Oftentimes the questions are: how can you design a system that works with lots of users or lots of data?

That can go in one of two directions:
- **Vertical scaling** — bigger hosts, more hardware, more memory, more CPU
- **Horizontal scaling** — duplicate our servers and find some way of balancing our requests and our data between them

Vertical scaling is by far my preference, and I think a lot of people are ignorant of how effective modern hardware can be. They're kind of stuck in this world of the early 2010s where Google needed to use commodity hardware in order to get anything done. In a lot of cases, you can find servers with terabytes of memory, and you should use them because I think they'll be effective.

But in interviews, interviewers are typically expecting that you're going to require some form of horizontal scaling, and so it's worth us talking about some of those implications.

### The Load Balancing Problem

The most important implication of horizontal scaling is you introduce this problem of **load balancing**, where I've got a client where previously I could connect to a single host, now I need to connect to multiple servers.

Load balancing serves two purposes:
1. **Spreads the load** — I can actually handle way more traffic than a single server could handle
2. **Facilitates high availability** — If server one goes down, theoretically my client can connect to server two and server three

When a lot of people hear load balancing, they think **load balancer**, like a dedicated device that's going to spread load. But that's not the only way to do load balancing.

There's theoretically two ways that we can do this:
1. **Client-side load balancing**
2. **Dedicated appliance**

### Client-Side Load Balancing

With client-side load balancing, what we're going to do is have the client be aware of all the servers that they can connect to. They will query some sort of registry that will tell them about the existence of all of the servers. Another path is for them to actually query the servers themselves — they might have a reference to one server, and they can ask that server about other servers. That's how Redis cluster works, for example.

The reason that client-side load balancing can be really effective is because it **doesn't introduce an additional hop of latency**. If I have client-side load balancing, then I can directly send my request to the server that's going to handle it. I don't have anything in the middle.

On the other hand, client-side load balancing requires that the clients get updates about the servers that exist, and I don't get to employ sophisticated load balancing techniques. I can't expect that my clients know, for instance, about the state of servers all the time.

**Use Client-Side Load Balancing When**:
- You don't have many clients (oftentimes the case on internal-facing microservices)
- You have lots of clients that you can tolerate update delays (example: DNS)

**DNS Example**: When we make a request to resolve hellointerview.com to IP addresses, we get a list. That list will be randomized or shuffled, and we are going to first hit the first server on that list, and if they don't respond, we'll hit the second, and so on. This allows aggregate consumers of DNS to handle load balancing by themselves.

But the **tolerate update delays** is really important for DNS, because DNS is heavily cached. If I make an update to that IP list, it might take anywhere between five minutes and a day for all DNS servers to receive that update and begin serving it to their clients. So it's not a great solution if I need to be able to react rapidly, either to scaling events or other issues.

**In Interviews**: Client-side load balancing can be very powerful, and it's definitely a tool for your arsenal. Use it for internal facing microservices — that's a great place for it. gRPC supports it natively, which is an awesome feature that you can use. But generally speaking, favor a dedicated load balancer in those cases where you need to be able to work with external clients that need to get updates relatively quickly.

### Dedicated Load Balancers

In those cases where I need to use a dedicated load balancer, I'm going to insert an appliance between my clients and the servers that I want to load balance. This appliance can be either hardware or software.

- **Hardware**: F5 networks has load balancers that scale up to hundreds of millions of transactions per second
- **Software**: HAProxy or Apache may scale to a million transactions per second
- **Cloud**: AWS's application load balancer or elastic load balancer

**How It Works**: When servers are initially spun up, they'll announce themselves to the load balancer saying, "hey, I'd like to receive traffic." The load balancer will then make **health check requests**, trying to determine whether the server can respond to the request that it's trying to load balance.

These health checks can either be:
- **Shallow**: Can you take a TCP connection?
- **Deep**: Can I look at the response from this HTTP request and see the status code?

These are all usually configurable parameters. Once your server has returned healthy a sufficient number of times, the load balancer will start routing traffic to it. And then once it's unhealthy or stops responding, the load balancer will stop sending it traffic.

### Load Balancing Algorithms

The way that load balancers balance that load is also configurable. There's a lot of different algorithms.

**Most Common (Stateless Services)**:
- **Round Robin** — rotate evenly
- **Random** — random selection

The nice thing about this: if we assume that the requests themselves are going to take a random amount of time, then we'll get approximately even load across my servers, and my load balancer doesn't have to do a whole lot of work.

**Leased Connections**:
- Look at all servers, find out how many connections I already have open between the load balancer and that server
- Only allocate new connections to the server that has the least connections

This can be nice when:
- New server introduced (scaling up) — want new connections to go there until it's even
- Long-running or stateful connections (WebSockets) — WebSockets might last for an hour, and random allocation would create really uneven load

### Layer 4 vs Layer 7 Load Balancers

Another consideration is at what level they're operating at.

**Layer 4 Load Balancer** (TCP level):
- Initiates a Layer 4 connection for every inbound connection
- Client creates TCP connection to LB → LB creates parallel TCP connection to server
- You can kind of pretend like this load balancer does not exist — as if client has connection directly with server
- **High performance** — doesn't need to look at packets, just pushes packets through

**Layer 7 Load Balancer** (HTTP level):
- Accepts HTTP requests at layer seven
- Chooses arbitrary server based on load balancing algorithm
- Server's connection with LB is not the same as client's connection
- LB might have few connections to servers and many to clients
- **More expensive** — needs to handle full HTTP request
- **But**: Can fan out multiple HTTP requests on single TCP connection to different servers

**When to Use Which**:
- **Layer 7 default** — REST APIs, routing options, TLS termination
- **Layer 4 exception** — WebSockets, stateful connections, extreme throughput needs
- Some Layer 7 LBs support WebSockets, but for the most part, Layer 7 isn't appropriate for connection-oriented protocols

---

## 6. Deep Dives: Practical Interview Topics

### Regionalization

Typically, in a system design interview, you're going to be asked to design a system that works across the entire globe. And when we talk about networking across the globe, we have to deal with the laws of physics.

If I wanted to make a connection between London and New York, the speed of light can only travel so fast in a fiber optic cable on either side of the Atlantic. From a practical perspective, I'm going to have about **80 milliseconds of latency no matter what I'm doing**. That could be a problem if I need to make lots of requests back and forth across the Atlantic.

Another problem: global scale traffic can be a challenge. For instance, designing Uber, which operates in many locations.

In a lot of cases, we can simplify these problems by recognizing where there are some **neat partitions in the problem**.

**Example - Uber**: Riders are typically only requesting drivers in cities that they're currently in. I'm not going to be requesting a London-based driver from Seattle. This really simplifies the problem.

What it means is that I can take my system design and duplicate it in the relevant cities. Those cities can operate at a much smaller scale, and I'm going to get all of the benefit of a regional network. All of my riders are going to get near instantaneous responses because my system is nice and close.

**Reality Check**: Having a data center in every city is probably impractical. Companies typically have data centers in regions associated with those cities (e.g., batch East Coast cities, West Coast cities).

**Key Principles for Regionalization**:
1. **Co-locate your data and processing** — Keep the core of your data and processing as close together as possible. While one request might come from London to New York, I'm probably going to make many requests back and forth between my web server and database. It would be silly to put web server in London (short hop) but have long hops to database.
2. **Get services as close to users as possible** — But you can't always move data globally (e.g., Reddit: users in Japan accessing posts from UK, commented by US users — data needs to be everywhere)

**Options for Global Data**:
- **Partition globally** — Data local to where most likely used (timezone differences mean less cross-region access)
- **Replicate data** — Write local, replicate async to other regions (accept some lag)
- **CDN (Content Delivery Network)** — Edge caches dotted around the globe (hundreds of locations called "edge locations")

**CDN Pattern**:
```
User → Edge Node (cache hit? return immediately) → Origin Server (on miss)
```
- Acts like a cache
- Reduces load on backend
- Not all data can be cached; on miss, edge node proxies to origin

---

### Timeouts & Retries (Gold Standard)

A lot of times people think about what happens when the server goes down, but they don't think about what happens when the network goes down or there's a partition in the network.

**First Rule**: When clients are connecting to a server, we want to make sure that they **eventually time out**.

Worst possible scenario: make a request, get acknowledgement it's in progress, and then never hear back. Client waits forever. Always put some sensible timeout on the request to make sure we eventually give up and send an error message to users.

Worst case: timeout too short (3 seconds) but server takes 4 seconds → always fail. Timeouts must be long enough for servers to respond, but not so long they don't serve their purpose.

**When Failure Happens**: We retry. This is a tried and true way to handle failure.

**Naive Approach**: Every 5 seconds, retry. Problems:
1. Server probably hasn't changed
2. **Bunching behavior** — if 3 clients all retry at same 5-second interval, they all hit the server simultaneously, overwhelming it again

**Two Tricks to Fix**:

1. **Exponential Backoff** — Time between retries increases
   - Attempt 1: wait 2 seconds
   - Attempt 2: wait 4 seconds
   - Attempt 3: wait 8 seconds
   - Then give up

   Two-sided purpose:
   - First retry quickly (transient failure like solar flare)
   - After 2+ failures, something substantial is wrong → give it time to recover
   - Spreads out load so server gets half as many requests in same period

2. **Jitter (Randomness)** — Add randomness to break synchronization
   - Red client: 2.5 seconds
   - Green client: 1.9 seconds
   - Blue client: quite a bit longer
   - Successive retries also spread out

   This kills synchronization, distributes load, gives server chance to recover.

**Gold Standard for Interviews**: Timeouts and retries with **exponential backoff with jitter**. That's what you could get away with in most sessions.

---

### Cascading Failures & Circuit Breakers

These are typically seen more in senior and staff level interviews, because senior/staff candidates have probably seen them before and have been burned by them.

**The Idea**: Sometimes problems in one part of the system can create problems in another part.

**Scenario**:
- Server A → Server B → Database
- All fine until admin triggers **database snapshot** → DB at 50% efficiency
- Server B has timeouts on DB requests → starts failing → retries (also failing) → tries 3 times → gives up
- Server A makes requests to B → some time out → retries → B goes down
- Try to restart B → same problem (DB still slow, A still hammering)

**What We Need**: Server A to give Server B a break, so B can give DB a break, so someone notices the snapshot.

**Solution: Circuit Breaker**

Like circuit breakers in your house: when current exceeds threshold, breaker flips off, requires human intervention.

Software circuit breaker:
- **Trips** when failure exceeds certain level
- **Periodically resets itself**

**States**:
1. **Closed** — Normal operation
2. **Open** — Fail fast, stop hammering downstream
3. **Half-Open** — Test probe, auto-reset on success

**What Happens**:
- Server A says: "Server B is obviously not handling my requests. I'm going to temporarily pause, fail all my requests, give it a chance to recover."
- Operations can notice B is slow (because of DB), fix DB problem
- When DB fixed, B responds normally → circuit breaker auto-resets → A comes back online

**Benefits**:
- Builds robust systems by failing in an obvious way
- You'll want alarms on circuit breakers so you know when they trip
- You know something is egregiously wrong, and you can handle it downstream
- Server A doesn't punish you while you try to bring B back up and fix the problem

---

## 7. Quick Reference: Protocol Selection Matrix

| Requirement | Recommended Protocol |
|-------------|---------------------|
| General API (default) | REST over HTTP/1.1 or HTTP/2 |
| Flexible frontend queries | GraphQL |
| High-perf internal services | gRPC |
| Server → Client push (short) | SSE |
| Bidirectional real-time | WebSockets |
| Audio/Video calls | WebRTC |
| Ultra-low latency, loss-tolerant | UDP |
| Browser compatibility required | TCP-based (HTTP, WS, SSE) |

---

## 8. Interview Checklist

- [ ] Can explain OSI layers relevant to system design (L3, L4, L7)
- [ ] Know when to use TCP vs UDP
- [ ] Can design RESTful APIs (resource-oriented, proper verbs)
- [ ] Understand GraphQL trade-offs (flexibility vs complexity)
- [ ] Know gRPC benefits and limitations (internal only)
- [ ] Can choose between SSE, WebSockets, WebRTC
- [ ] Understand client-side vs dedicated load balancing
- [ ] Know Layer 4 vs Layer 7 load balancer trade-offs
- [ ] Can design for regionalization (partitioning, CDN, replication)
- [ ] Implement timeouts + retries with exponential backoff + jitter
- [ ] Apply circuit breakers to prevent cascading failures

---

## Summary

Networking in system design interviews centers on **protocol selection**, **load balancing strategy**, and **failure handling**. Master the defaults (REST, TCP, Layer 7 LB), know when to deviate (gRPC, WebSockets, UDP), and always design for failure (timeouts, retries, circuit breakers).

These form the basis of most of what you need to know from a networking perspective to be effective in a system design interview. There are obviously deep dives that we can go into for specific problems, but this will get you 90% of the way there for most interviews.