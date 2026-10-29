# Phase J.1 relationship review

Baseline commit: `fb44e89b3b8e65e3949239dac32a8e8ae69b65e1`

## Existing coverage

- Reviewed relationships: 59
- Participating roles: 53/1107
- By type: activity-related 2; alias 1; broader-than 12; commonly-overlapping 13; directional-counterpart 13; near-synonym 2; persona-related 1; sibling 2; switch-counterpart 13

Low graph density is an inventory fact, not a requirement to connect every role. This review prioritizes relationships that clarify scored vocabulary or could affect recommendation redundancy.

## High-value candidates

### submissive â†” Bottom

- Proposed type: `commonly-overlapping`
- Rationale: These can co-occur, but yielding authority and receiving an activity remain distinct.
- Existing edge: no
- Existing recommendation candidate co-occurrence: bottom-not-submissive, rejects-submissive, rope-focused-bottom, service-bottom-independent, submissive-not-bottom
- Optimizer consequence: Behavior-sensitive: this relationship type can change redundancy penalties in existing candidate scenarios.
- Status: hypothesis requiring editorial and behavioral approval; not applied.

### Owner â†” Pet

- Proposed type: `directional-counterpart`
- Rationale: The scored owner and pet roles are the reviewed guiding and receiving directions in adult pet play.
- Existing edge: no
- Existing recommendation candidate co-occurrence: none in the 50 deterministic scenarios
- Optimizer consequence: Behavior-sensitive in future candidate sets because reviewed relationships participate in redundancy penalties.
- Status: hypothesis requiring editorial and behavioral approval; not applied.

### Trainer â†” Pet

- Proposed type: `directional-counterpart`
- Rationale: Trainer is guiding/training vocabulary commonly paired with the pet position while remaining distinct from ownership.
- Existing edge: no
- Existing recommendation candidate co-occurrence: none in the 50 deterministic scenarios
- Optimizer consequence: Behavior-sensitive in future candidate sets because reviewed relationships participate in redundancy penalties.
- Status: hypothesis requiring editorial and behavioral approval; not applied.

### Bondage Top â†” Bondage Switch

- Proposed type: `switch-counterpart`
- Rationale: Bondage Switch can include the restraint-giving position represented by Bondage Top.
- Existing edge: no
- Existing recommendation candidate co-occurrence: none in the 50 deterministic scenarios
- Optimizer consequence: Behavior-sensitive in future candidate sets because reviewed relationships participate in redundancy penalties.
- Status: hypothesis requiring editorial and behavioral approval; not applied.

### Bondage Bottom â†” Bondage Switch

- Proposed type: `switch-counterpart`
- Rationale: Bondage Switch can include the restraint-receiving position represented by Bondage Bottom.
- Existing edge: no
- Existing recommendation candidate co-occurrence: none in the 50 deterministic scenarios
- Optimizer consequence: Behavior-sensitive in future candidate sets because reviewed relationships participate in redundancy penalties.
- Status: hypothesis requiring editorial and behavioral approval; not applied.

### Handler â†” Pet

- Proposed type: `directional-counterpart`
- Rationale: Handler is guiding vocabulary commonly paired with the pet position while remaining distinct from ownership.
- Existing edge: no
- Existing recommendation candidate co-occurrence: none in the 50 deterministic scenarios
- Optimizer consequence: Behavior-sensitive in future candidate sets because reviewed relationships participate in redundancy penalties.
- Status: hypothesis requiring editorial and behavioral approval; not applied.

### Rigger â†” Rope Switch

- Proposed type: `commonly-overlapping`
- Rationale: A Rope Switch may tie, while Rigger emphasizes the tying/craft direction rather than bidirectionality.
- Existing edge: no
- Existing recommendation candidate co-occurrence: none in the 50 deterministic scenarios
- Optimizer consequence: Behavior-sensitive in future candidate sets because reviewed relationships participate in redundancy penalties.
- Status: hypothesis requiring editorial and behavioral approval; not applied.


## Important non-edge finding

The scored role **Authority Holder** has no exact public-library node, even though other library roles reference its scored ID as a nearest role. The accepted Dominant/Authority Holder overlap therefore cannot be represented as a normal reviewed library edge until the intended public vocabulary mapping receives an editorial decision.

## Behavioral boundary

Reviewed relationship types participate in optimizer redundancy and primary centrality. Even a semantically correct edge can change Suggested Role Set composition. Every proposed edge therefore requires scenario-level optimizer comparison before production metadata changes.
