# WIPO Connect reference (captured read-only from the ZAMCOPS WIPO Connect instance, Oct 2026)

Everything below was read from the live WIPO Connect pages (menu JSON, page HTML, grid headers, record windows).
Nothing here is invented. Where a page is not listed it has not been captured yet. The data files
(`data/wipo/*.json`) are exact copies of WIPO's reference grids.

## Main menu (`/connect/mvc/common/mainMenu.json`)

| Group | Items → WIPO page |
|---|---|
| Rights Owners | Browse `interestedParty/search` · Pending (same, pendingMode) · Group `groupManagement/search` · Set `interestedPartySet/search` · Import/Export `interestedPartyImportExport/search` |
| Works | Browse all Creation Classes · Musical Works (MW) · AV Works (AV) · AV Productions (AVP) · Sound Recordings (SR) · Textual Works and Publications (LW,LF,LN,DW,SM) · Theatrical and Dance (DM) · Visual Arts (WA,PH) — all `work/search` with a creation-class filter · Pending (pendingMode) · Set `workSet/search` · Import/Export `workImportExport/search` |
| Agreements and Mandates | Browse `agreement/search` · Pending |
| Licensing and Invoicing | Agents `agent/search` · Licensees `licenseeAccount/search` · Licenses & Invoices `license/search` · Tariff Types `tariffType/search` · Collection Requests `collectionRequest/collectionRequestSearch` |
| Matching and Distribution | Usage Log `usageLog/search` · Broadcast Monitoring `broadcastMonitoring/search` · Matching Settings `matchingSettings/search` · Distribution `distribution/search` · Distribution Pool `distributionPool/search` · Allocation Method `allocationMethod/search` · Pending Matches `matchingGroup/search` · Reserve Management `reserveManagement/search` |
| BI & Reports | Business Intelligence `businessIntelligence/search` · Audit `audit/search` |
| Operational | CMO `reference/cmo/search` · Territories `reference/territories/search` · Reference Table `reference/referenceTable/search` · Identifiers `reference/identifiers/search` · Local References `reference/localReferences/search` |
| Administration | User Accounts `administration/account/search` · Security Groups `administration/group/search` · Parameters `administration/parametersManagement/detail` · Technical Settings `administration/technicalSettings/detail` · Dynamic Fields `administration/dynamicField/search` · Issue Log `administration/issueLog/search` |
| Debug | Debug information, rebuild indexes, evict cache … (technical; not reproduced) |

## Pages and their grids

### Rights Owners (`interestedParty/search`)
- Search (simple): Id, Main … ; advanced labels: Id · Main · IPI Name · IPI First Name · Type (Natural person / Legal entity) · Affiliation CMO · Creation Class(es) · Registration From/To · Status (Incomplete, Local, To be validated, Conflict, Deleted, Sync, To Be Sync) · Date of Birth · Country of Birth · Citizenship · Affiliation Role · Tags · Search Local / Search Shared.
- Grid: Score · Main Id · International Identifier · Names · NN · Type · Birth/Found · CMO · Creation Class(es) · Tags · Status. Buttons: Add RO, Search, Clear, Bulk Actions.
- Right Owner Set (`interestedPartySet`): grid Id · Right Owner Set Name · # of Rights Owners; Add Right Owner Set; Bulk Actions.
- Import/Export: "File to Import", "Export Format", Upload.
- Group (`groupManagement`): grid Id · Name of Group · Members; Add Group; Search; Bulk Actions.

### Works (`work/search`)
- Search labels: Id · Main · Title(Type) · OT · Creation Class · Domestic Repertoire · Distributable Status (Fully / Partially / Not Distributable) · Status (Local, To be validated, Conflict, Deleted, Suspended, Sync, To Be Sync) · Main Artist · Registration From/To · Genre in WIPOCOS · Catalogue Number · Category · Label · Country of Production · Date Type · Date · Right Owners Name(s) · Tags · Search Local / Search Shared.
- Grid: Score · Main Id · Int. Id · Title · Rights Owners · Creation Class · Repertoire · Distributable Status · Catalogue Number · Country of Production · Label · Date · Tags · Status. Buttons: Add Work, Search, Clear, Bulk Actions (Copy, Send to ISWC, Sync Shared, Desync Shared, Delete, ISWC through Shared).
- Work window tabs: Main · Detail · Distribution History · Audit.
- Work Set (`workSet`): grid Id · Work Set name · Creation Class · # of Works; Add Work set; Bulk Actions.

### Agreements and Mandates (`agreement/search`)
- Search: Code · Status (Valid, Duplicate Claim, In Dispute, Deleted, Cycle) · Agreement Type (General, Implied, Specific Exclude, Specific Include) · Include Inactive · Assignor · Assignee · Right Category (PER, MEC, SYN, POI, PCT).
- Grid: Code · Assignor · Assignee · Type · Creation Class · # of Works · Territory · Right Category · Effective End Date · Status · Active. Buttons: Add Agreement, Search, Clear, Bulk Actions.
- Agreement summary window tabs: Main · Covered Works · Excluded Works · Inactive. Fields: Agreement Type (General / Specific Exclude / Specific Include) · Creation Class · Assignor · Assignee · Code · Signature Date · Source Type (Assignee, Assignor, External Source, Sister CMO) · Context · Start/End Date · Effective Start/End Date · Right Category · Territory · Shares; Documents (Description, Filename); Comment(s).

### Licensing and Invoicing
- Agent (`agent/search`): filter Include Inactive; grid Id · Name · Middle Name(s) · Surname · Area · Licensee Category · Creation Class · Status. Window tabs Main · Detail; fields Id, Name, Middle Name(s), Surname, Account, Creation Class, Supervisor (user), Tariff Type, Licensee Category (Private individual, Micro-entrerpise, Small to medium enterprise (SME), Large corporation), Active, Area Configuration (Country, State, City, District).
- Licensee (`licenseeAccount/search`): search Business Type (DSP, Gym, Hotel, Library), Professional/Licensee ID or Name, Include Inactive, Export full data; grid Id · Name · Area · Tags · Status · # of Licenses. Window tabs Main · Detail; fields Id, Licensee Type (Natural person/Legal entity), Corporate Citizenship, Licensee Category, Business Type, Name + Name Type (BN Brand Name, GN Group/Holding Name, LN Legal Name).
- License (`license/search`): search Id · Tariff Type · Business Type · Professional/Licensee ID or Name · Include ended licenses · Tags · Export full data; grid Id · Collection type · Professional/Licensee Name · Start Date · End Date · Sale Date · Periodicity · Tariff Type · # of Usage · # of Coll. Req. · Tags · Agent · Status. Window tabs Main · Usage and Collection · Versions; fields Id, Collection type (Blanket License, Resale Right, Specific License), Professional/Licensee, Licensee Address, Licensee Tax Information, Start/End/Signature/Sale Date, % VAT, Licensing Periodicity (One-Time, Recurring), Frequency of Invoicing (Annually, Bi-monthly, Monthly, Quarterly, Semi-Annually), Creation Class, Covered Works (Add / Add Work Set), Documents, Comment(s); buttons Save Draft Data, Save Draft Version.
- Tariff Type (`tariffType/search`): grid Id · Name · Parameters; fields Name, Usage Type (Collection Level / Usage Level), Formula, Parameters (Type, Field for Tariff Formula).
- Collection Request (`collectionRequest`): grid ID · Collection type · Status · Start Date · End Date · Sale Date · Total Amount · Paid Amount · Due Amount.

### Matching and Distribution
- Distribution list: Main Id · Name · Method · # of DPLs · Sum Amounts · Allocated Amount · Status · Run Date; filter Status (Open/Closed); buttons per row: details, Pend. Match (log-based), Pend. Works, Close, delete; Add Distribution.
- Distribution Summary window: tabs Main · Summary · Analysis · Statements; toolbar Refresh, Stop statements generation, Regenerate Statements, Pending Works; Main fields Main Id, Name, Start Date, End Date, Deadline, Narrative, "Sync with Portal" On/Off; panel "Distribution Pool Link" (Add; columns Main Id · Distribution Pool · Creation Class · Right Type · Distribution Method · Class · Sub Class · Period · # of Works · Status · Amount; row actions Show Details · Run Allocation · Stop Allocation · Results · Delete); "IP Distribution Adjustment Amount"; Comment(s).
- Distribution Pool Link window tabs: Main · Source · Covered Works. Main fields: Distribution Pool, Distribution Method, Creation Class, Right Type, Reserve Type, Work Allocation Method, RO Allocation Method, Amount, Currency Symbol, Start/End Date, Split by, Class, Sub Class, Domestic Admin Fee, International Revenue Admin Fee, International Admin Fee, Reserved Admin Fee, Narrative; affiliation filters (CMO of affiliation: ZAMCOPS / All-ZAMCOPS / Unknown Affiliation RO / other CMOs; creation class; affiliation role). Covered Works: Add Work, Add Work Set; grid Main Id · Work Title · Int. Id · Rights Owners · Status · Distributable Status · Weight · Estimated Amount.
- Distribution Pool (`distributionPool/search`): grid Code · Creation Class · RT · Distribution Method · Log Allocation Method · Log Source · Status (Open/Archived). Window fields: Code, Distribution Method (Analogy, CRD, Log Based, Reserve, RO List, Work List), Creation Class, Right Type (BT, MR, OB, OD, PC, PR, RB, SY, TB, TO, TP, TV), Work Role, Class, Sub Class, Work Allocation Method, RO Allocation Method, RO excluded amounts, Log Source, Log Allocation Method, International Revenue Stream (On/Off), Reserve Type, Work Share Tolerance, Reallocate within the Work, Comment(s); Archive / Delete / Save.
- Allocation Method (`allocationMethod/search`): two lists — Work Allocation Method and Right Owner Allocation Method (grid: Name). Form: Name + Formula. Work formula fields `$Weight$`, `$Work$.fieldName`; RO formula fields `$Weight$`, `$Ro$.fieldName`, `$Work$.fieldName`, `$Role$`.
- Reserve Management (`reserveManagement/search`): filters CC, RT, Distribution, Reserve Type (UP), Reserved Date From/To, Status (Open, In Distribution, Prescribed, Closed); buttons Clear Search, Search, Match, Export results; grid Distribution · Distr pool · Class · Sub Class · CC · RT · Reserve Type · Reserved Date · Closed/Prescribed Date · Amount · Distributable Amount · Distributed Amount · Status.
- Pending Matches (`matchingGroup/search`): filters Amount From/To (ZMW), Matching status (To be matched, Possible match, Matched, Not matched, Ignored), Performer, Creator, Class, Sub Class, DPLs; grid Title · Performers · Creators · Identifiers · Result · Status · Distr. · Estimated Amount.
- Usage Log (`usageLog/search`): grid Filename · Upload Date · Matching Start Date · Process Time · Rows Count · Groups Count · Distribution · DPL Main Id · Status · Priority.
- Matching Settings (`matchingSettings/search`): Log Format (Name · File Format · Creation Class · # Header Lines · # Footer lines · # Sheet), Log Source (Name · Log Format · Pre-matching similarity · # Works · Min Threshold · Max Threshold · # History Entries), Log Allocation Method (Name · Log Format).
- Broadcast Monitoring (`broadcastMonitoring/search`): "Select time range" (Last month / 3 months / 6 months / year).

### BI & Reports
- Business Intelligence: Query name (38 queries: WORK Identifier, WORK Status, Distributable status, Distributed, Distributed per Main Id and CC, Entered within a certain period of time, SR without any PC, SWI Reports, Works declared by members, Work Set format for CWR, Creation class, Role, City, RO Identifier, RO Status, Birthday, Deceased, IPBN-IPINN discrepancies, Joined within specific period, Minors/below 18 years of age, Certain age, Distributed Amount, Work Genre, No Works for a specific CC, Number of Works by RO, Lack of IPI Name Number, RO, RO and Distribution Pool, Work, Work and Distribution Pool, Unidentified grouped Title, Unidentified grouped Title and Distribution Pool code, UP list by Distribution and DPL ID, CAPASSO - SWI Format, SONACAM - MW Repertoire format, ZIMURA - Membership Repertoire, ZAMCOPS - List of beneficiaries per society code, UPRS - Disaffiliated members, UPRS - Repertoire report, COPYGHANA - List of works by type and market, ZARRSO - Copyright Detained on T&I, GHAMRO - Distribution Payment Method, Member's contact); Export Format CSV / Json; Search.
- Audit: Entity Type (Work / RightOwner), Start/End Audit Period, Author of the Change, Affiliation CMO, Main ID, Show only Terminal; Search, Clear.

### Operational (reference data; `data/wipo/*.json`)
- CMO: 535 entries (`cmo.json`): Code · Acronym · Name · Country of Origin · Type · Creation Class.
- Territories: 250 entries (`territories.json`): TISN · TISA · Name · Type · Start Date · End Date.
- Reference Table (creation classes): 21 classes (`creation-classes.json`): Code · Name · Description · Work Share Base · Work Identifier · Work Additional Fields · Domestic Work · Domestic Admin. Fee · International Revenue Admin. Fee · International Admin. Fee · Reserved Admin. Fee. Add Creation Class.
- Identifiers: 18 entries (`identifiers.json`): Code · Acronym · Name · Creation Classes · Entity · Type. Add Identifier.
- Local References: AGREEMENT_SOURCE_TYPE "Agreement Source Type".

### Administration
- User Accounts: grid Email · Name · Type (Operator/Agent) · Status · Security Group(s); Add User Account — fields Email, Name, First Name, UI Language Code (English, French, Portuguese, Spanish), Account type, Status (Active / Not active), Password, Repeat password, Tags, Groups, Matching Amount (Min / Max Amount (ZMW)).
- Security Groups: grid Name · Description · Permissions; Add Security Group — Name, Description, Note, Permissions (Add), Users. Permission names: User Account (Access/Management), Security (Management), Administration (Management), Configuration (Access/Management), Interested Party (Access/Management/Retrieval/Submission), Work (Access/Management/Sync/Permanent Deletion), Agreement (Access/Management), Distribution (Access/Management), Licensee (Access/Management), License (Access/Management), Reference (Access/Management), Groups (Access/Management), Tags (Access/Management), Work Set (Access/Management), Matching (Access/Management), Distribution Administration (Access/Management), Dynamic Field (Access/Management), Report (Access), Debug, IP Bank Info (Management), Right Owner (Permanent Deletion), Broadcast Monitoring (Access), Interested Party Set (Access/Management), Pending Matches Access.
- Parameters: Territory, Language, Decimal Separator, Grouping Separator, Currency Symbol, Currency Position, IP Sync, Work Sync, Rp Id, Rp Name, Allowed Origin, Authors / Publishers / Performers / Producers role lists, List of Work Roles, Manage Components, International Identifiers, IPI Name Numbers, Main Roles, **Reserve UP amount, Reserve to Incomplete RO, Reserve to Undistributable Works, Reserve to NS RO, Reserve to DP RO (Yes/No)**, **Close distribution (Days)**, Number of digits, CRD Payment Currency, CMO Name/Address 1/Address 2/Phone/Tax Number/Bank Name/Bank Number, CMO Signature (Job Title, Name, Surname), License End Date, Agent Creation Class / Licensee Category / Tariff Type / Area, Main ID Prefix for Agent / License / Licensee / Collection Request / Tariff Type; Default Share, Default Affiliation, Reprographic Category.
- Technical Settings: Base URL, Username, Password, Formula; Test, Save.
- Dynamic Fields: add buttons for Right Owner, Work, Account, License, Distribution Pool, Distribution.
- Issue Log: Delete All.

## Captured later (Oct 2026)

- **Security Groups**: 44 permissions with codes (`data/wipo/permissions.json`) and WIPO's 3 groups (`data/wipo/security-groups.json`).
- **Parameters**: 15 sections / 50 fields (`lib/parameters.ts`).
- **Technical Settings**: four connections (Shared, IPI, ISWC, Open IPN: Base URL, Username, Password, Test, Save) and the Work Validation formula. Keys are never copied.
- **Right types per creation class** for Agreements (`data/wipo/right-types-by-cc.json`).
- **Agreements**: types General / Implied / Specific Exclude / Specific Include; WIPO holds none for ZAMCOPS.
- **Matching Settings** (`data/wipo/matching-settings.json`): 5 log formats, 5 log sources (weights, thresholds, pre-matching), 5 log allocation methods.
- **Usage Log**: 11 imports in WIPO (statuses IMPORT_ERROR, MATCH_COMPLETED).
- **BI**: the parameters of all 38 queries (`lib/biCatalogue.ts`).
- **Licensing** (Agent, Licensee, License, Tariff Type, Collection Request): WIPO holds no records for ZAMCOPS and Tariff Type has no usable Usage Type configured; not built yet.

## What the portal does and does not do yet

Built to WIPO's structure: Operational (CMO, Territories, Reference Table, Identifiers, Local References), Administration (User Accounts, Security Groups, Parameters, Technical Settings, Dynamic Fields, Issue Log), Audit, Agreements and Mandates, Matching Settings, Usage Log (xlsx import, fuzzy matching, Pending Matches, log based allocation), Distribution Pool list, Business Intelligence (26 of 38 queries), Works and Rights Owners lists (fields the register holds), Home tiles, per-creation-class Works menu.

Not built, or only partly:
- Licensing and Invoicing pages.
- Agreements: Pending view, Documents.
- Broadcast Monitoring; Rights Owner Set; Import/Export pages; Work Set import.
- Rights Owners / Works search filters on data the register does not hold (Creation Class(es) of an RO, Country of Birth, Citizenship, Affiliation Role, Tags, Catalogue Number, Label, Country of Production, Search Shared).
- Parameters stored but not yet applied by the allocation engine: Reserve UP amount, Reserve to Incomplete RO / Undistributable Works / NS RO / DP RO, Close distribution (Days), Number of digits.
- Permissions are enforced on the Administration, Agreements, Matching, Pending Matches, Reference and BI endpoints only.
