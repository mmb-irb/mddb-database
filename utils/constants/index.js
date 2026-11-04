// Set the configuration of every mongo collection
// Set local and global collections separatedly since they may use different indexes
// name - Actual name of the collection inside the database
// indexes - Index configuration in the database, for the collections setup
// documentNames - Document names used for displaying only
// parent - Collection and fields to determine if documents are orphan
const LOCAL_COLLECTIONS = {
    projects: {
        name: 'projects',
        indexes: [
            { accession: 1 },
            { booked: 1, deleted: 1 },
            { published: 1, booked: 1, deleted: 1 },
        ],
        documentNames: { singular: 'project', plural: 'projects' },
        parent: null,
    },
    uniprot_refs: {
        name: 'references',
        indexes: [{ uniprot: 1 }],
        documentNames: { singular: 'reference', plural: 'references' },
        parent: { collectionKey: 'projects', referenceField: 'metadata.REFERENCES', localField: 'uniprot' },
    },
    inchikey_refs: {
        name: 'inchikey_refs',
        indexes: [{ inchikey: 1 }],
        documentNames: { singular: 'inchikey', plural: 'inchikeys' },
        parent: { collectionKey: 'projects', referenceField: 'metadata.INCHIKEYS', localField: 'inchikey' },
    },
    pdb_refs: {
        name: 'pdb_refs',
        indexes: [{ id: 1 }],
        documentNames: { singular: 'PDB', plural: 'PDBs' },
        parent: { collectionKey: 'projects', referenceField: 'metadata.PDBIDS', localField: 'id' },
    },
    chain_refs: {
        name: 'chain_refs',
        indexes: [{ sequence: 1 }],
        documentNames: { singular: 'chain', plural: 'chains' },
        parent: { collectionKey: 'projects', referenceField: 'metadata.PROTSEQ', localField: 'sequence' },
    },
    collection_refs: {
        name: 'collection_refs',
        documentNames: { singular: 'collection', plural: 'collections' },
        parent: { collectionKey: 'projects', referenceField: 'metadata.COLLECTIONS', localField: 'id' },
    },
    topologies: {
        name: 'topologies',
        indexes: [{ project: 1 }],
        documentNames: { singular: 'topology', plural: 'topologies' },
        parent: { collectionKey: 'projects', referenceField: '_id', localField: 'project' },
    },
    files: {
        name: 'fs.files',
        indexes: [{ 'metadata.project': 1 }, { 'metadata.reftype': 1, 'metadata.refid': 1 }],
        documentNames: { singular: 'file', plural: 'files' },
        parent: { collectionKey: 'projects', referenceField: '_id', localField: 'metadata.project' },
    },
    chunks: {
        name: 'fs.chunks',
        documentNames: { singular: 'chunk', plural: 'chunks' },
        parent: { collectionKey: 'files', referenceField: '_id', localField: 'files_id' },
    },
    analyses: {
        name: 'analyses',
        indexes: [{ project: 1 }],
        documentNames: { singular: 'analysis', plural: 'analyses' },
        parent: { collectionKey: 'projects', referenceField: '_id', localField: 'project' },
    },
    counters: {
        name: 'counters',
        documentNames: { singular: 'counter', plural: 'counters' },
        parent: null,
    },
};
const GLOBAL_COLLECTIONS = {
    projects: {
        name: 'global.projects',
        indexes: [
            { accession: 1 },
            { node: 1, local: 1 },
            { booked: 1, deleted: 1 },
            { posited: 1, booked: 1, deleted: 1 },
        ],
        documentNames: { singular: 'project', plural: 'projects' },
    },
    uniprot_refs: {
        name: 'global.references',
        indexes: [{ uniprot: 1 }],
        documentNames: { singular: 'reference', plural: 'references' },
    },
    inchikey_refs: {
        name: 'global.inchikeys',
        indexes: [{ inchikey: 1 }],
        documentNames: { singular: 'inchikey', plural: 'inchikeys' },
    },
    pdb_refs: {
        name: 'global.pdb_refs',
        indexes: [{ id: 1 }],
        documentNames: { singular: 'pdb', plural: 'pdbs' },
    },
    chain_refs: {
        name: 'global.chain_refs',
        indexes: [{ sequence: 1 }],
        documentNames: { singular: 'chain', plural: 'chains' },
    },
    collection_refs: {
        name: 'global.collection_refs',
        documentNames: { singular: 'collection', plural: 'collections' },
    },
    nodes: {
        name: 'global.nodes',
        documentNames: { singular: 'topology', plural: 'topologies' },
    },
    counters: {
        name: 'global.counters',
        documentNames: { singular: 'counter', plural: 'counters' }
    },
    pointers: {
        name: 'pointers',
        indexes: [{ 'proteins.uniprot': 1 }, { 'pdbs.id': 1 }],
        documentNames: { singular: 'pointers', plural: 'pointers' }
    }
};

// Set the configuration of every reference collection
// Configuration for local and global collections should be identical
// The 'idField' is the field inside every reference document which stores the reference id
// The 'projectIdsField' is the field inside project documents with a list of reference ids related to the project
// Set the header of query field paths which are not in the project but in a references collection
// e.g. 'references.proteins.organism' is the 'organism' field in the proteins references collection
const REFERENCE_HEADER = 'references.';

const REFERENCES = {
    proteins: {
        collectionName: 'uniprot_refs',
        idField: 'uniprot',
        projectIdsField: 'metadata.REFERENCES'
    },
    inchikeys: {
        collectionName: 'inchikey_refs',
        idField: 'inchikey',
        projectIdsField: 'metadata.INCHIKEYS'
    },
    pdbs: {
        collectionName: 'pdb_refs',
        idField: 'id',
        projectIdsField: 'metadata.PDBIDS'
    },
    chains: {
        collectionName: 'chain_refs',
        idField: 'sequence',
        projectIdsField: 'metadata.PROTSEQ'
    },
    collections: {
        collectionName: 'collection_refs',
        idField: 'id',
        projectIdsField: 'metadata.COLLECTIONS'
    }
};

// Set the expected query fields
// Note that other fields not stated here may be queried anyway
// - name - Pretty name used for logs
// - path - Actual path in the database. It may contain the 'references' header which means data is not in the project
// - alias - Short and human friendly name which may be used instead of the path (e.g. in the API filters)
//   Aliases are written in camel case and they stand for the same field everywhere
//   Aliases must be unique and they must not match any actual path other than their own
// - description - What the field holds, its units and which projects lack it, for the API docs and other clients
// - type - string, int, float, boolean or date
//   All these values tirgger internal logic to better handled queries for every type of data.
// - example - Also for the logs
// - options - Set if different available values in this field are to be counted to further show the available options
//   e.g. metadata system keywords are to be counted, thus we know how many simulations are tagged as protein, nucleic, etc.
//   However it does not make sense to count metadata name or atom counts, since they should be different for every project
//   The loader and the monitor will make sure the following fields are counted and their counts updated when pertinent
//   This is useful to speed up the response time of the "project/options" endpoint from the API
//   The API will use the precounted values when available, but it is still able to count options from a field on its own
// - global - Set if this field is available only in global projects (e.g. node, posited)
const QUERY_FIELDS = [
    {
        name: "Keywords",
        path: "metadata.SYSKEYS",
        alias: "keyword",
        description: "System keywords from the workflow residue classification: protein, dna, rna, lipid, carbohydrate, ligand, solvent, counter ion, non-counter ion and other; one of them with \"only\" (e.g. protein only) when it is the single class besides solvent and ions; membrane and nucleosome. Newer workflows also add multimerism (e.g. homodimer, double strand) and resolution (all-atom (aa), united atom (ua), coarse grained (cg)). Missing in projects from older workflows.",
        type: "string",
        example: "protein",
        options: true,
    },
    {
        name: "Interactions",
        path: "metadata.INTERACTIONS.type",
        alias: "interaction",
        description: "Type of each interaction analyzed: the residue classes of its two agents, sorted alphabetically and joined by a dash (e.g. dna-protein, other-protein), except protein-ligand.",
        type: "string",
        example: "protein-protein",
        options: true,
    },
    {
        name: "System atom count",
        path: "metadata.SYSTATS",
        alias: "systemAtoms",
        description: "Number of atoms in the system.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "System residue count",
        path: "metadata.SYSTRES",
        alias: "systemResidues",
        description: "Number of residues in the system.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Protein atom count",
        path: "metadata.PROTATS",
        alias: "proteinAtoms",
        description: "Number of protein atoms.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Protein residue count",
        path: "metadata.PROTRES",
        alias: "proteinResidues",
        description: "Number of protein residues.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "DNA atom count",
        path: "metadata.DNAATS",
        alias: "dnaAtoms",
        description: "Number of DNA atoms. Some projects from older workflows count all nucleic acids in NUCLATS instead.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "DNA residue count",
        path: "metadata.DNARES",
        alias: "dnaResidues",
        description: "Number of DNA residues. Some projects from older workflows count all nucleic acids in NUCLRES instead.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "RNA atom count",
        path: "metadata.RNAATS",
        alias: "rnaAtoms",
        description: "Number of RNA atoms. Some projects from older workflows count all nucleic acids in NUCLATS instead.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "RNA residue count",
        path: "metadata.RNARES",
        alias: "rnaResidues",
        description: "Number of RNA residues. Some projects from older workflows count all nucleic acids in NUCLRES instead.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Lipid atom count",
        path: "metadata.LIPIATS",
        alias: "lipidAtoms",
        description: "Number of lipid atoms.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Lipid residue count",
        path: "metadata.LIPIRES",
        alias: "lipidResidues",
        description: "Number of lipid residues. Some force fields split each lipid in several residues.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Carbohydrates atom count",
        path: "metadata.CARBATS",
        alias: "carbohydrateAtoms",
        description: "Number of carbohydrate atoms.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Carbohydrates residue count",
        path: "metadata.CARBRES",
        alias: "carbohydrateResidues",
        description: "Number of carbohydrate residues.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Solvent atom count",
        path: "metadata.SOLVATS",
        alias: "solventAtoms",
        description: "Number of solvent (water) atoms.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Solvent residue count",
        path: "metadata.SOLVRES",
        alias: "solventResidues",
        description: "Number of solvent (water) residues, i.e. water molecules.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Counter cation count",
        path: "metadata.COUNCAT",
        alias: "counterCations",
        description: "Number of counter cations (e.g. Na+, K+).",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Counter anion count",
        path: "metadata.COUNANI",
        alias: "counterAnions",
        description: "Number of counter anions (e.g. Cl-).",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Counter ion count",
        path: "metadata.COUNION",
        alias: "counterIons",
        description: "Number of counter ions: counter cations plus counter anions.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Non-counter ion count",
        path: "metadata.NOCNION",
        alias: "nonCounterIons",
        description: "Number of ions which are not counter ions, such as structural Zn2+ or Mg2+. Missing in projects from older workflows.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Other atom count",
        path: "metadata.OTHRATS",
        alias: "otherAtoms",
        description: "Number of atoms in no other class, such as those of ligands and cofactors. Missing in projects from older workflows.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Protein sequence",
        path: "metadata.PROTSEQ",
        alias: "proteinSequence",
        description: "Protein chain sequences in one-letter code, one per distinct sequence, in order of appearance. A regular expression ($regex) finds a sequence motif.",
        type: "string",
        example: "VNLTTRT",
        options: false
    },
    {
        name: "Nucleic acid sequences",
        path: "metadata.NUCLSEQ",
        alias: "nucleicSequence",
        description: "DNA and RNA chain sequences in one-letter code, one per distinct sequence, in order of appearance.",
        type: "string",
        example: "CGCGAATTCGCG",
        options: false
    },
    {
        name: "Domains",
        path: "metadata.DOMAINS",
        alias: "domain",
        description: "Names of the UniProt domains and regions which the simulated protein residues overlap.",
        type: "string",
        example: "Receptor-binding domain (RBD)",
        options: true
    },
    {
        name: "Post translational modifications",
        path: "metadata.PTM",
        alias: "ptm",
        description: "Post-translational modifications found in the structure, e.g. Acetylation, Glycosilation or Amidation.",
        type: "string",
        example: "Glycosylation",
        options: true
    },
    {
        name: "Multimeric form",
        path: "metadata.MULTIMERIC",
        alias: "multimeric",
        description: "Multimeric state of the protein (monomer, dimer, trimer...). Only in projects from older workflows: newer ones add it to the system keywords (e.g. homodimer).",
        type: "string",
        example: "Dimer",
        options: true,
    },
    {
        name: "PDB id",
        path: "metadata.PDBIDS",
        alias: "pdbId",
        description: "PDB ids the system was built from. Obsolete entries are replaced by the ones that superseded them.",
        type: "string",
        example: "12CA",
        options: true,
    },
    {
        name: "PDB title",
        path: "references.pdbs.title",
        alias: "pdbTitle",
        description: "Title of the PDB entries the system was built from.",
        type: "string",
        example: "kinetics of human carbonic anhydrase",
    },
    {
        name: "PDB classification",
        path: "references.pdbs.class",
        alias: "pdbClass",
        description: "PDB classification of the entries the system was built from.",
        type: "string",
        example: "acid",
        options: true,
    },
    {
        name: "PDB authors",
        path: "references.pdbs.authors",
        alias: "pdbAuthor",
        description: "Authors of the PDB entries the system was built from, written as \"Wang, X.\".",
        type: "string",
        example: "CHRISTIANSON",
        options: true,
    },
    {
        name: "PDB organism",
        path: "references.pdbs.organisms",
        alias: "pdbOrganism",
        description: "Source organisms of the PDB entries the system was built from.",
        type: "string",
        example: "Homo sapiens",
        options: true,
    },
    {
        name: "PDB method",
        path: "references.pdbs.method",
        alias: "pdbMethod",
        description: "Experimental method of the PDB entries the system was built from, e.g. X-RAY DIFFRACTION or ELECTRON MICROSCOPY.",
        type: "string",
        example: "X-RAY DIFFRACTION",
        options: true,
    },
    {
        name: "PDB resolution",
        path: "references.pdbs.resolution",
        alias: "pdbResolution",
        description: "Resolution of the PDB entries the system was built from. No workflow version stores it yet, so it matches no project.",
        type: "float",
        example: "2.4",
    },
    {
        name: "Ligand name",
        path: "references.inchikeys.ligand.name",
        alias: "ligandName",
        description: "Name of the ligands and lipids in the system. Older InChI key references keep ligand data under pubchem instead, so they never match.",
        type: "string",
        example: "aclidinium",
        options: true,
    },
    {
        name: "Ligand PubChem id",
        path: "references.inchikeys.ligand.pubchem",
        alias: "ligandPubchem",
        description: "PubChem compound id (CID) of the ligands and lipids in the system. Older InChI key references keep ligand data under pubchem instead, so they never match.",
        type: "string",
        example: "1986",
        options: true,
    },
    {
        name: "Ligand DrugBank id",
        path: "references.inchikeys.ligand.drugbank",
        alias: "ligandDrugbank",
        description: "DrugBank id of the ligands in the system. Older InChI key references keep ligand data under pubchem instead, so they never match.",
        type: "string",
        example: "DB09330",
        options: true,
    },
    {
        name: "Ligand ChEMBL id",
        path: "references.inchikeys.ligand.chembl",
        alias: "ligandChembl",
        description: "ChEMBL id of the ligands in the system. Older InChI key references keep ligand data under pubchem instead, so they never match.",
        type: "string",
        example: "CHEMBL14830",
        options: true,
    },
    {
        name: "Ligand PDB code",
        path: "references.inchikeys.ligand.pdbid",
        alias: "ligandPdbId",
        description: "PDB chemical component code of the ligands in the system. Older InChI key references keep ligand data under pubchem instead, so they never match.",
        type: "string",
        example: "HEM",
        options: true,
    },
    {
        name: "InChI key",
        path: "metadata.INCHIKEYS",
        alias: "inchikey",
        description: "InChI keys of the ligands, lipids and other small molecules identified in the system. Missing in projects from older workflows.",
        type: "string",
        example: "HVYWMOMLDIMFJA-DPAQBDIFSA-N",
        options: true,
    },
    {
        name: "Uniprot id",
        path: "metadata.REFERENCES",
        alias: "uniprotId",
        description: "UniProt accessions of the proteins in the system. noref marks protein chains with no UniProt entry (e.g. designed ones) and notfound those whose entry was not found.",
        type: "string",
        example: "Q9BYF1",
        options: true
    },
    {
        name: "Uniprot organism",
        path: "references.proteins.organism",
        alias: "uniprotOrganism",
        description: "Organism of the UniProt proteins in the system.",
        type: "string",
        example: "Homo sapiens",
        options: true
    },
    {
        name: "Uniprot gene",
        path: "references.proteins.gene",
        alias: "uniprotGene",
        description: "Gene name of the UniProt proteins in the system.",
        type: "string",
        example: "ACE2",
        options: true
    },
    {
        name: "Uniprot name",
        path: "references.proteins.name",
        alias: "uniprotName",
        description: "Name of the UniProt proteins in the system.",
        type: "string",
        example: "Angiotensin-converting enzyme 2",
        options: true
    },
    {
        name: "Uniprot protein function",
        path: "references.proteins.functions",
        alias: "uniprotFunction",
        description: "Gene Ontology molecular functions of the UniProt proteins in the system.",
        type: "string",
        example: "RNA binding",
        options: true
    },
    {
        name: "Program",
        path: "metadata.PROGRAM",
        alias: "program",
        description: "MD program, as the uploader wrote it, so spellings vary.",
        type: "string",
        example: "Gromacs",
        options: true,
    },
    {
        name: "Type",
        path: "metadata.TYPE",
        alias: "type",
        description: "trajectory (frames along time) or ensemble (independent conformations).",
        type: "string",
        example: "ensemble",
        options: true,
    },
    {
        name: "MD method",
        path: "metadata.METHOD",
        alias: "method",
        description: "MD method, as the uploader wrote it, e.g. Classical MD, Umbrella sampling or Constant pH MD.",
        type: "string",
        example: "Classical MD",
        options: true,
    },
    {
        name: "Timestep (fs)",
        path: "metadata.TIMESTEP",
        alias: "timestep",
        description: "Integration timestep in femtoseconds (fs).",
        type: "float",
        example: "2",
        options: true,
    },
    {
        name: "Force field",
        path: "metadata.FF",
        alias: "forcefield",
        description: "Force fields, as the uploader wrote them, so names vary between projects.",
        type: "string",
        example: "CHARMM36m",
        options: true,
    },
    {
        name: "Water type",
        path: "metadata.WAT",
        alias: "water",
        description: "Water model, e.g. TIP3P, OPC or SPCE.",
        type: "string",
        example: "TIP3",
        options: true,
    },
    {
        name: "Temperature (K)",
        path: "metadata.TEMP",
        alias: "temperature",
        description: "Temperature in Kelvin (K).",
        type: "float",
        example: "300",
        options: true,
    },
    {
        name: "Ensemble",
        path: "metadata.ENSEMBLE",
        alias: "ensemble",
        description: "Thermodynamic ensemble, e.g. NVT or NPT.",
        type: "string",
        example: "NPT",
        options: true,
    },
    {
        name: "Boxtype",
        path: "metadata.BOXTYPE",
        alias: "box",
        description: "Shape of the simulation box. Older uploads typed it by hand, so spellings vary (cubic, Cubic...).",
        type: "string",
        example: "Triclinic",
        options: true,
    },
    {
        name: "Framestep (ns)",
        path: "metadata.FRAMESTEP",
        alias: "framestep",
        description: "Time between consecutive frames in nanoseconds (ns).",
        type: "float",
        example: "any number",
        options: false
    },
    {
        name: "Number of frames",
        path: "mds.frames",
        alias: "frames",
        description: "Number of frames of each MD.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Chain names",
        path: "metadata.CHNAME",
        alias: "chainName",
        description: "Distinct chain names in the structure. Missing in projects from older workflows.",
        type: "string",
        example: "M",
        options: true,
    },
    {
        name: "Residue names",
        path: "metadata.RSNAME",
        alias: "residueName",
        description: "Distinct residue names in the structure. Missing in projects from older workflows.",
        type: "string",
        example: "NME",
        options: true,
    },
    {
        name: "Atom names",
        path: "metadata.ATNAME",
        alias: "atomName",
        description: "Distinct atom names in the structure. Missing in projects from older workflows.",
        type: "string",
        example: "OT1",
        options: true,
    },
    {
        name: "Atom elements",
        path: "metadata.ATELEM",
        alias: "atomElement",
        description: "Distinct chemical elements in the structure. Missing in projects from older workflows.",
        type: "string",
        example: "Zn",
        options: true,
    },
    {
        name: "Name",
        path: "metadata.NAME",
        alias: "name",
        description: "Project title.",
        type: "string",
        example: "spike opening ...",
        options: false
    },
    {
        name: "Description",
        path: "metadata.DESCRIPTION",
        alias: "description",
        description: "Free-text description of the project.",
        type: "string",
        example: "this simulation ...",
        options: false
    },
    {
        name: "Authors",
        path: "metadata.AUTHORS",
        alias: "author",
        description: "Authors of the simulations.",
        type: "string",
        example: "Modesto Orozco",
        options: true,
    },
    {
        name: "Groups",
        path: "metadata.GROUPS",
        alias: "group",
        description: "Research groups or institutions behind the simulations.",
        type: "string",
        example: "IRB Barcelona, Orozco lab",
        options: true,
    },
    {
        name: "Citation",
        path: "metadata.CITATION",
        alias: "citation",
        description: "Publication to cite for the simulations, usually a DOI.",
        type: "string",
        example: "institute of ...",
        options: false
    },
    {
        name: "Collections",
        path: "metadata.COLLECTIONS",
        alias: "collection",
        description: "Ids of the collections the project belongs to, described by the collection references.",
        type: "string",
        example: "cv19",
        options: true,
    },
    {
        name: "Published",
        path: "published",
        alias: "published",
        description: "Whether the node shows the project publicly.",
        type: "boolean",
        example: "true",
        options: true,
    },
    {
        name: "Posited",
        path: "posited",
        alias: "posited",
        description: "Whether the global database shows the project publicly. Global API only.",
        type: "boolean",
        example: "true",
        options: true,
        global: true,
    },
    {
        name: "Source node",
        path: "node",
        alias: "node",
        description: "Alias of the node which stores the project. Global API only.",
        type: "string",
        example: "mmb",
        options: true,
        global: true,
    },
    {
        name: "Available MD analyses",
        path: "mds.analyses.name",
        alias: "analysis",
        description: "Names of the analyses available for each MD.",
        type: "string",
        example: "pca",
        options: true,
    },
    {
        name: "Project warnings",
        path: "metadata.WARNINGS.tag",
        alias: "warning",
        type: "string",
        example: "stabonds",
        options: true,
    },
    {
        name: "MD warnings",
        path: "mds.warnings.tag",
        alias: "mdWarning",
        type: "string",
        example: "stabonds",
        options: true,
    },
    {
        name: "Project files",
        path: "files.name",
        alias: "file",
        description: "Names of the files stored for the whole project.",
        type: "string",
        example: "topology.tpr",
        options: true
    },
    {
        name: "MD files",
        path: "mds.files.name",
        alias: "mdFile",
        description: "Names of the files stored for each MD.",
        type: "string",
        example: "pocket_10.pdb",
        options: true
    },
    {
        name: "Number of MDs",
        path: "mdcount",
        alias: "mdCount",
        description: "Number of MDs (replicas) in the project.",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Last update date",
        path: "updateDate",
        alias: "updated",
        description: "When the project was last updated. The API takes ISO date strings.",
        type: "date",
        example: "2026-02-04T10:57:00.988Z",
        options: false
    },
    {
        name: "Creation date",
        path: "creationDate",
        alias: "created",
        description: "When the project was created. The API takes ISO date strings.",
        type: "date",
        example: "2026-02-04T10:57:00.988Z",
        options: false
    },
    {
        name: "Simulation time (ns)",
        path: "mds.time",
        alias: "mdTime",
        type: "float",
        example: "any number",
        options: false
    },
    {
        name: "Mean global RMSD (Å)",
        path: "mds.rmsd_mean",
        alias: "rmsdMean",
        type: "float",
        example: "any number",
        options: false
    },
    {
        name: "Standard deviation of global RMSD (Å)",
        path: "mds.rmsd_stdv",
        alias: "rmsdStdv",
        type: "float",
        example: "any number",
        options: false
    },
    {
        name: "Maximum global RMSD (Å)",
        path: "mds.rmsd_max",
        alias: "rmsdMax",
        type: "float",
        example: "any number",
        options: false
    },
    {
        name: "Collection name",
        path: "references.collections.name",
        alias: "collectionName",
        type: "string",
        example: "BioExcel COVID-19",
        options: false
    },
    {
        name: "Covid-19 unit",
        path: "metadata.CV19_UNIT",
        alias: "cv19Unit",
        type: "string",
        example: "ACE2",
        options: false
    },
    {
        name: "Covid-19 variant",
        path: "metadata.CV19_VARIANT",
        alias: "cv19Variant",
        type: "string",
        example: "Delta",
        options: false
    },
    {
        name: "Presence of antibodies (Covid-19)",
        path: "metadata.CV19_ABS",
        alias: "cv19Antibodies",
        type: "boolean",
        example: "true",
        options: false
    },
    {
        name: "Presence of nanobodies (Covid-19)",
        path: "metadata.CV19_NANOBS",
        alias: "cv19Nanobodies",
        type: "boolean",
        example: "true",
        options: false
    },
    {
        name: "Spike starting conformation (Covid-19)",
        path: "metadata.CV19_STARTCONF",
        alias: "cv19StartConformation",
        type: "string",
        example: "open",
        options: false
    },
];
// Store the same query field configurations in a object where paths are the keys for comodity
const PATH_QUERY_FIELDS = Object.fromEntries(QUERY_FIELDS.map(q => [q.path, q]));
// Store the same query field configurations in a object where aliases are the keys
const ALIAS_QUERY_FIELDS = {};
QUERY_FIELDS.forEach(q => {
    if (!q.alias) throw new Error(`Query field "${q.name}" has no alias`);
    if (q.alias in ALIAS_QUERY_FIELDS) throw new Error(`Duplicated query field alias "${q.alias}"`);
    if (q.alias in PATH_QUERY_FIELDS && q.alias !== q.path)
        throw new Error(`Query field alias "${q.alias}" matches the path of a different field`);
    ALIAS_QUERY_FIELDS[q.alias] = q;
});
// Get the path of every field with "options = true" together
// Get all fields for the monitor and all fields but the "global = true" for the loader
const queryFieldsWithOptions = QUERY_FIELDS.filter(qf => qf.options);
const localQueryFieldsWithOptions = queryFieldsWithOptions.filter(qf => qf.global !== true);
const OPTIONS_QUERY_FIELDS = new Set(queryFieldsWithOptions.map(qf => qf.path));
const LOCAL_OPTIONS_QUERY_FIELDS = new Set(localQueryFieldsWithOptions.map(qf => qf.path));

// Set constants related to issuing new accessions
// Set the first accession code
// Accession codes are alphanumeric and the first value is to be letter
const FIRST_ACCESSION_CODE = 'A0001';
const ACCESSION_CHARACTERS_LIMIT = FIRST_ACCESSION_CODE.length;
// Set the alhpanumeric number of characters: 36 (10 numbers + 24 letters)
const ALPHANUMERIC = 36;

// Set some constants
module.exports = {
    // Export mongo collections
    LOCAL_COLLECTIONS,
    GLOBAL_COLLECTIONS,
    // Export references
    REFERENCES,
    REFERENCE_HEADER,
    // Export query fields
    QUERY_FIELDS,
    PATH_QUERY_FIELDS,
    ALIAS_QUERY_FIELDS,
    OPTIONS_QUERY_FIELDS,
    LOCAL_OPTIONS_QUERY_FIELDS,
    // Standard filenames
    STANDARD_TRAJECTORY_FILENAME: 'trajectory.bin',
    STANDARD_STRUCTURE_FILENAME: 'structure.pdb',
    STANDARD_BOX_FILENAME: 'box.bin',
    // Export constants related to issuing new accessions
    FIRST_ACCESSION_CODE,
    ACCESSION_CHARACTERS_LIMIT,
    ALPHANUMERIC,
}