# Initial-owner discovery probe

**Status: the long-address probe passed for the known Mainnet creation.** The
user's Hasura response was compared with a fresh public fullnode sample: all
17 window rows matched, and the initial co-owner lookup returned `7345859301`.
This verifies the probe's sample, not complete vault discovery. Production
processors and mobile queries remain unchanged.

Use [multisig-creation-probe-long-address.yaml](./multisig-creation-probe-long-address.yaml).
Its only semantic change from the original probe is the payload function key:

```yaml
custom_config:
  payload:
    0x0000000000000000000000000000000000000000000000000000000000000001::multisig_account::create_with_owners:
      '0':
        - table: multisig_creation_probe
          column: owners
```

The original [short-address YAML](./multisig-creation-probe.yaml) remains as the
bug reproduction. It is not the file to import for this retry.

## Verified result

The user supplied the deployed GraphQL response after tracking the new table
in Hasura. Comparison with a fresh fetch of versions `7345859291`–`7345859311`
passed:

- `creation` returned `7345859301`, the expected initial co-owner, and gas units
  `11873`.
- `owner_lookup` returned that same version for the co-owner, who differs from
  the transaction sender. The successful transaction's written multisig resource
  contains both the co-owner and creator.
- All 17 `window` rows matched the fullnode data, including transaction versions,
  owners, standardized event types, and gas values. The 16 unrelated fee rows
  had null `owners`, as expected.

This confirms that the full-address workaround allows payload enrichment and
owner-array lookup for the tested creation. It also confirms that the payload
mapping does not exclude unrelated fee transactions in this sample. Stop the
probe after collecting the result; further fee ingestion is unnecessary for
this verification.

The comparison used the user's pasted Hasura result, not a direct authenticated
request to the processor. Failed-call handling, other creation paths, historical
coverage, ingestion cost, and mobile integration remain to be validated.

## Verify another vault and discover owner candidates

[vault-owner-discovery.graphql](./vault-owner-discovery.graphql) runs without
variables in Hasura and defaults to owner
`0xc476707d8a2d5c00242096332855ab0968225cbdc1cce0e25532b1df33f98eb0`.
It removes the earlier sample's upper version bound.

- `target_creation` checks version `7350673760` for this owner. A public
  [fullnode fetch](https://api.mainnet.aptoslabs.com/v1/transactions/by_version/7350673760)
  confirmed that this successful `create_with_owners` call by
  `0xc8afd0a0a7fc403d4785f1458d4a465993425fa339938ac3ac24396f4a877282`
  created vault
  `0xe4f95233928a4957db9988417d6d35318f88769804625a960298fb179f04d5f7`,
  with the queried owner in argument `0`. The resource currently contains both
  owners. The processor must run through that version before testing its row.
- `creation_candidates` returns up to 100 matching versions in ascending order.
  For subsequent pages, set `afterVersion` to the last returned version and
  repeat until empty. Override `owner` for the active wallet. The fixed
  `target_creation` alias is only a diagnostic and should be omitted from the
  mobile query.

The probe has no vault-address column: each returned version must be fetched
from the fullnode, checked for success, and resolved through its multisig
resource writes. Deduplicate addresses and verify current ownership before
display. Combine these candidates with creator history and later owner events;
the query alone cannot list every owned vault or recover history before the
processor's starting version.

The user's first result for this query returned an empty `target_creation`,
with candidate versions `7345859301`, `7347901015`, and `7347937978`. The target
was ahead of the processor's reported version `7349077670`.

On 2026-09-25, after processing reached `7352113486`, the user supplied a new
response with `7350673760` and the invited owner in both `target_creation` and
`creation_candidates`. This second vault test passed after catch-up. The response
contains seven candidate versions; that count is not a verified count of current
owned vaults. Each candidate still needs transaction resolution and a current
ownership check before display.

The newest matching candidate alone does not establish processing progress.

Run [vault-owner-discovery-status.graphql](./vault-owner-discovery-status.graphql)
to inspect the newest fee row across all owners and look up the target version
without an owner filter. Also check Geomi's latest processed version against
`7350673760`. If the probe was stopped after the first experiment, resume it
and let it reach the new target before assessing the mapping. A present target
with missing owners indicates an enrichment issue; an absent target after
processing has passed it requires investigating missing ingestion/history.

## Geomi team's findings

The following comes from the team's source review shared in this conversation;
we have not independently run their UI or processor implementation locally.

- Payload mappings support `vector<address>` and the existing column shape
  (`move_type` / `address`, `is_vec: true`).
- Both import and direct YAML entry pass through the graph editor. Its function
  lookup uses the supplied account address, while fetched ABIs use the full
  address. The short `0x1` key misses the lookup and loses its source edge.
  Review then reports an unmapped column, and serialization omits that column.
  The full address is the team's workaround. Event keys already normalize
  addresses, so the event mapping does not need the same change.
- Events create rows; payload arguments and transaction metadata only enrich
  those rows. A function mapping does not filter ingestion. This FeeStatement
  probe therefore stores unrelated transactions with null `owners`.
- Failed calls can also have FeeStatement and payload arguments. A non-null
  `owners` value does not prove creation succeeded. Success and VM status are
  not available as metadata mappings.
- Resource-write indexing is not implemented in this remapping processor.
  A resource-based solution would require a different processor or a new feature.

## Import and verify the retry

1. Create a separate processor named `multisig-creation-probe-v2`, on Mainnet,
   starting at `7345859291`. Import the **long-address YAML** above. It contains
   only a probe table; do not replace the production processor's mappings.
2. In Review Config, confirm `custom_config.payload` still maps argument `0` to
   `owners`, and `db_schema.multisig_creation_probe.owners` still exists as a
   nullable address vector. If either disappears or validation fails, stop and
   report that result to Geomi instead of deploying another stripped config.
3. Create the processor, wait for Running and a processed version of at least
   `7345859311`, then open its own Hasura console. Track only
   `public.multisig_creation_probe` if it is untracked. Confirm `owners` exists.
4. Run [multisig-creation-probe.graphql](./multisig-creation-probe.graphql).
   The [schema query](./multisig-creation-probe-schema.graphql) can inspect
   exposed GraphQL roots and columns if needed.
5. Record the reviewed config, processed version, and query response, then stop
   the test processor. The YAML has **no automatic end version**; a query range
   does not limit ingestion. Keep the old fee-only test stopped as well.

Expected results for the inclusive window `7345859291`–`7345859311`:

- `creation` contains version `7345859301`, co-owner
  `0xc476707d8a2d5c00242096332855ab0968225cbdc1cce0e25532b1df33f98eb0`,
  and `total_charge_gas_units` of `11873`.
- `owner_lookup` returns `7345859301`. The creator is not expected in `owners`.
- `window` contains 17 fee rows: the creation plus 16 unrelated transactions
  with null `owners`. Four system transactions in the sample have no fee event.
  These extra rows are expected, not evidence that the mapping failed.

A missing or null owner on the known successful creation means the workaround
has not passed. If unrelated fee rows are absent, investigate the deployment
and processing range rather than concluding that payload mapping filters them.
The [public transaction sample](https://api.mainnet.aptoslabs.com/v1/transactions?start=7345859291&limit=21)
provides the comparison data. The created vault is
`0xafb026bab856645f9906ae85ce8cbd1300b70ee86fc1384a89393ec5ea274162`.

## What the passing probe enables

This table supplies candidate creation versions for initial additional owners.
It is not a complete owner registry. Mobile would need a new query for those
versions, alongside its existing creator-history and owner-event queries.

The existing mobile `readCreationAddresses` already fetches the transaction,
rejects unsuccessful transactions, and extracts written multisig resource
addresses. Its `snapshot` checks current on-chain ownership. Reuse those checks
for this new candidate source; do not treat payload addresses as proof that a
vault exists or that the wallet is still an owner. Add a failed-creation case to
integration validation before connecting the source to production.

Creator omission does not by itself block the reported `create_with_owners`
fix: mobile already has a creator-history query for that function. However,
plain `create()`, bootstrapper-removal, existing-account creation, and custom
wrappers need separate coverage. The retry deliberately adds no extra function
mappings, so the address-format change is tested in isolation.

Before production use, resolve the cost of indexing every FeeStatement and
plan historical coverage/backfill. A GraphQL filter does not reduce ingestion.
Sender metadata would help creator coverage, but would not by itself provide
success filtering or support every creation path. Resource indexing remains a
separate implementation option outside this no-code processor.

## Earlier deployment

The original short-address probe was accepted despite the review error:

> Column 'owners' in table 'multisig_creation_probe' has no source mappings. All table columns must have at least one source mapping.

Review showed `payload: {}` and omitted `owners`. The processor reached Running
and passed the sample range. Its table was initially untracked in Hasura; after
tracking, Browse Rows showed only `version`, `fee_event_type`, and
`total_charge_gas_units`. This verified fee ingestion, not owner discovery.
The team subsequently identified the ABI lookup issue described above.

## Source verification

Checked on 2026-09-24 against Aptos source commit
[`cc09f4c`](https://github.com/aptos-labs/aptos-core/blob/cc09f4c5f6d96acacc3e2637d84265111d5d6cc1/aptos-move/framework/aptos-framework/sources/multisig_account.move).

- [`create_with_owners`](https://github.com/aptos-labs/aptos-core/blob/cc09f4c5f6d96acacc3e2637d84265111d5d6cc1/aptos-move/framework/aptos-framework/sources/multisig_account.move#L784-L802)
  adds the creator to `additional_owners`. Payload argument `0` alone therefore
  omits the creator.
- [`create_with_owners_internal`](https://github.com/aptos-labs/aptos-core/blob/cc09f4c5f6d96acacc3e2637d84265111d5d6cc1/aptos-move/framework/aptos-framework/sources/multisig_account.move#L877-L916)
  writes `MultisigAccount.owners` directly. It initializes event handles without
  emitting `AddOwners` or `AddOwnersEvent`, and disables the metadata event.
- Later additions use
  [`update_owner_schema`](https://github.com/aptos-labs/aptos-core/blob/cc09f4c5f6d96acacc3e2637d84265111d5d6cc1/aptos-move/framework/aptos-framework/sources/multisig_account.move#L1611-L1658),
  which emits `AddOwners`. The demonstrated gap concerns initial co-owners;
  post-creation additions have an event source already mapped by the indexer.
- [`owners` and `is_owner`](https://github.com/aptos-labs/aptos-core/blob/cc09f4c5f6d96acacc3e2637d84265111d5d6cc1/aptos-move/framework/aptos-framework/sources/multisig_account.move#L418-L428)
  require a known vault address; they do not discover vaults from an owner.

The historical Mainnet transaction `7345859301` was fetched again: it succeeds,
emits only `FeeStatement`, and writes both owners into the multisig resource.
This independently verifies the repro; current `main` is not evidence of the
exact framework revision deployed at that historical version.

Inference: indexing resource writes would capture the ownership state directly.
This Move source does not establish Geomi payload or resource-indexing support.

## Validation limits

Local checks verify YAML shape, the single semantic change, and the expected
sample data. A published Rust config-type round-trip verifies serialization
only; its package version is not the deployed processor version. The subsequent
user-provided Hasura response supplies runtime evidence for the known creation
and sample window. It does not establish production completeness or correctness
for failed transactions and other creation paths.
