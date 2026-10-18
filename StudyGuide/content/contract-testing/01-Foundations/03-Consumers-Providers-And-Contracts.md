# Consumers, Providers & Contracts

## The question this page answers

Contracts only make sense relative to two roles. Who is the **consumer**? Who is the **provider**? Who writes the contract, and who owns it? This page pins down the vocabulary before the workflow pages build on it.

## The two roles

A **consumer** is any service, client, or component that *sends* a request and depends on the response. A **provider** is any service that *receives* the request and returns the response.

The roles are relative, not fixed. `order-service` is a consumer of `user-service`, and simultaneously a provider to `notification-service` (via an event). The same service can be both.

| Role | Sends | Depends on | Example |
| ---- | ----- | ---------- | ------- |
| Consumer | request / event | the response shape | `order-service` calling `user-service` |
| Provider | response | honouring requests | `user-service` serving `GET /users/{id}` |

## The interaction pair

A single contract is built from **interactions**. An interaction always has two halves:

- a **request** (method, path, headers, body) the consumer will send, and
- a **response** (status, headers, body) the consumer expects back.

For HTTP the pair looks like this:

```text
  Consumer request                    Provider response
  ─────────────────                   ─────────────────
  GET /users/42                       status 200
  Accept: application/json            Content-Type: application/json
                                      {
                                        "id": 42,
                                        "name": "Ada Lovelace",
                                        "email": "ada@example.com",
                                        "active": true,
                                        "createdAt": "2024-01-05T10:00:00Z"
                                      }
```

**Figure 1 —** One interaction = one request paired with the response the consumer relies on.

## One contract per consumer-provider pair

A contract is *not* global. Each **consumer-provider pair** gets its own contract, so each consumer's real usage is tracked independently. If `order-service` and `web-dashboard` both call `user-service`, there are two contracts — even though there is one provider.

```text
   ┌────────────────┐              ┌────────────────┐
   │ order-service  │              │ web-dashboard  │
   │  (consumer)    │              │  (consumer)    │
   └────────┬───────┘              └────────┬───────┘
            │                               │
            │ order-service-                │ web-dashboard-
            │ user-service.json             │ user-service.json
            ▼                               ▼
   ┌─────────────────────────────────────────────────────┐
   │                  user-service (provider)            │
   │                  GET /users/{id}                    │
   └─────────────────────────────────────────────────────┘
```

**Figure 2 —** One provider, two consumers, two independent contracts.

## A pact is a collection of interactions

The contract artifact produced by the consumer is called a **pact file**. It is simply a versioned list of interactions between one consumer and one provider. The same `order-service` might record several interactions against `user-service`:

- `GET /users/42` → `200` with the user body
- `GET /users/999` → `404` when the user does not exist

A small pact file looks like this (abridged — the full anatomy is covered later):

```json
{
  "consumer": { "name": "order-service" },
  "provider": { "name": "user-service" },
  "interactions": [
    {
      "description": "a request for user 42",
      "providerStates": [{ "name": "user 42 exists" }],
      "request": { "method": "GET", "path": "/users/42" },
      "response": {
        "status": 200,
        "body": {
          "id": 42,
          "name": "Ada Lovelace",
          "email": "ada@example.com",
          "active": true,
          "createdAt": "2024-01-05T10:00:00Z"
        }
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "4.0" } }
}
```

## The same roles apply to events

A **message** interaction follows the same pattern. `order-service` publishes `order-created` on the topic `orders`; `notification-service` consumes it. For this interaction, `order-service` is the **provider** and `notification-service` is the **consumer**.

```text
   ┌────────────────┐   publish "order-created"   ┌──────────────────────┐
   │ order-service  │──────────► topic "orders" ─►│ notification-service │
   │  (provider)    │  payload                     │  (consumer)          │
   └────────────────┘                              └──────────────────────┘
```

**Figure 3 —** Events invert the roles: the publisher provides the message, the subscriber consumes it.

The payload `notification-service` depends on:

```json
{
  "orderId": "ORD-1001",
  "userId": 42,
  "total": 129.99,
  "createdAt": "2024-02-01T12:00:00Z"
}
```

## Contract ownership

Ownership follows the pair:

| Artifact | Owner | Responsibility |
| -------- | ----- | -------------- |
| Consumer expectations | consumer team | only depend on what you truly need |
| Provider implementation | provider team | satisfy every recorded consumer expectation |
| Contract (pact file) | generated by consumer | single source of truth for the pair |
| Verification result | provider build | published for the **broker** and release gates |

The consumer owns *what is required*; the provider owns *whether it is delivered*. Neither team can unilaterally change what the pair has agreed without failing verification.

## Recap

- **Consumer** sends and depends; **provider** receives and honours.
- An **interaction** is a request paired with its expected response.
- There is **one contract per consumer-provider pair**, not one per provider.
- A **pact file** is a collection of interactions for one pair.
- Consumers own expectations; providers own satisfaction of them.

## Practice

1. `notification-service` consumes the `order-created` event that `order-service` publishes. Which is the consumer and which is the provider?

2. `user-service` is called by both `order-service` and `web-dashboard`. How many contracts exist, and why not just one?

> **Answer.** 1. For that interaction `order-service` is the **provider** (it publishes the event/message) and `notification-service` is the **consumer** (it receives and depends on the payload). 2. Two contracts, one per consumer-provider pair. Each consumer uses a different subset of the response, so merging them would hide which consumer a breaking change affects and would over-promise to each.

## See also

- [What Is Contract Testing?](01-What-Is-Contract-Testing.md)
- [Consumer-Driven vs Producer-Driven](04-Consumer-Driven-vs-Producer-Driven.md)
- [Core Vocabulary](06-Core-Vocabulary.md)
- [The Pact Broker & PactFlow](../02-Pact-Workflow/11-The-Pact-Broker-And-PactFlow.md)
