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
        type: "string",
        example: "protein",
        options: true,
    },
    {
        name: "Interactions",
        path: "metadata.INTERACTIONS.type",
        alias: "interaction",
        type: "string",
        example: "protein-protein",
        options: true,
    },
    {
        name: "System atom count",
        path: "metadata.SYSTATS",
        alias: "systemAtoms",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "System residue count",
        path: "metadata.SYSTRES",
        alias: "systemResidues",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Protein atom count",
        path: "metadata.PROTATS",
        alias: "proteinAtoms",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Protein residue count",
        path: "metadata.PROTRES",
        alias: "proteinResidues",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "DNA atom count",
        path: "metadata.DNAATS",
        alias: "dnaAtoms",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "DNA residue count",
        path: "metadata.DNARES",
        alias: "dnaResidues",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "RNA atom count",
        path: "metadata.RNAATS",
        alias: "rnaAtoms",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "RNA residue count",
        path: "metadata.RNARES",
        alias: "rnaResidues",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Lipid atom count",
        path: "metadata.LIPIATS",
        alias: "lipidAtoms",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Lipid residue count",
        path: "metadata.LIPIRES",
        alias: "lipidResidues",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Carbohydrates atom count",
        path: "metadata.CARBATS",
        alias: "carbohydrateAtoms",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Carbohydrates residue count",
        path: "metadata.CARBRES",
        alias: "carbohydrateResidues",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Solvent atom count",
        path: "metadata.SOLVATS",
        alias: "solventAtoms",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Solvent residue count",
        path: "metadata.SOLVRES",
        alias: "solventResidues",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Counter cation count",
        path: "metadata.COUNCAT",
        alias: "counterCations",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Counter anion count",
        path: "metadata.COUNANI",
        alias: "counterAnions",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Counter ion count",
        path: "metadata.COUNION",
        alias: "counterIons",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Non-counter ion count",
        path: "metadata.NOCNION",
        alias: "nonCounterIons",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Other atom count",
        path: "metadata.OTHRATS",
        alias: "otherAtoms",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Protein sequence",
        path: "metadata.PROTSEQ",
        alias: "proteinSequence",
        type: "string",
        example: "VNLTTRT",
        options: false
    },
    {
        name: "Nucleic acid sequences",
        path: "metadata.NUCLSEQ",
        alias: "nucleicSequence",
        type: "string",
        example: "CGCGAATTCGCG",
        options: false
    },
    {
        name: "Domains",
        path: "metadata.DOMAINS",
        alias: "domain",
        type: "string",
        example: "Receptor-binding domain (RBD)",
        options: true
    },
    {
        name: "Post translational modifications",
        path: "metadata.PTM",
        alias: "ptm",
        type: "string",
        example: "Glycosylation",
        options: true
    },
    {
        name: "Multimeric form",
        path: "metadata.MULTIMERIC",
        alias: "multimeric",
        type: "string",
        example: "Dimer",
        options: true,
    },
    {
        name: "PDB id",
        path: "metadata.PDBIDS",
        alias: "pdbId",
        type: "string",
        example: "12CA",
        options: true,
    },
    {
        name: "PDB title",
        path: "references.pdbs.title",
        alias: "pdbTitle",
        type: "string",
        example: "kinetics of human carbonic anhydrase",
    },
    {
        name: "PDB classification",
        path: "references.pdbs.class",
        alias: "pdbClass",
        type: "string",
        example: "acid",
        options: true,
    },
    {
        name: "PDB authors",
        path: "references.pdbs.authors",
        alias: "pdbAuthor",
        type: "string",
        example: "CHRISTIANSON",
        options: true,
    },
    {
        name: "PDB organism",
        path: "references.pdbs.organisms",
        alias: "pdbOrganism",
        type: "string",
        example: "Homo sapiens",
        options: true,
    },
    {
        name: "PDB method",
        path: "references.pdbs.method",
        alias: "pdbMethod",
        type: "string",
        example: "X-RAY DIFFRACTION",
        options: true,
    },
    {
        name: "PDB resolution",
        path: "references.pdbs.resolution",
        alias: "pdbResolution",
        type: "float",
        example: "2.4",
    },
    {
        name: "Ligand name",
        path: "references.inchikeys.ligand.name",
        alias: "ligandName",
        type: "string",
        example: "aclidinium",
        options: true,
    },
    {
        name: "Ligand PubChem id",
        path: "references.inchikeys.ligand.pubchem",
        alias: "ligandPubchem",
        type: "string",
        example: "1986",
        options: true,
    },
    {
        name: "Ligand DrugBank id",
        path: "references.inchikeys.ligand.drugbank",
        alias: "ligandDrugbank",
        type: "string",
        example: "DB09330",
        options: true,
    },
    {
        name: "Ligand ChEMBL id",
        path: "references.inchikeys.ligand.chembl",
        alias: "ligandChembl",
        type: "string",
        example: "CHEMBL14830",
        options: true,
    },
    {
        name: "Ligand PDB code",
        path: "references.inchikeys.ligand.pdbid",
        alias: "ligandPdbId",
        type: "string",
        example: "HEM",
        options: true,
    },
    {
        name: "InChI key",
        path: "metadata.INCHIKEYS",
        alias: "inchikey",
        type: "string",
        example: "HVYWMOMLDIMFJA-DPAQBDIFSA-N",
        options: true,
    },
    {
        name: "Uniprot id",
        path: "metadata.REFERENCES",
        alias: "uniprotId",
        type: "string",
        example: "Q9BYF1",
        options: true
    },
    {
        name: "Uniprot organism",
        path: "references.proteins.organism",
        alias: "uniprotOrganism",
        type: "string",
        example: "Homo sapiens",
        options: true
    },
    {
        name: "Uniprot gene",
        path: "references.proteins.gene",
        alias: "uniprotGene",
        type: "string",
        example: "ACE2",
        options: true
    },
    {
        name: "Uniprot name",
        path: "references.proteins.name",
        alias: "uniprotName",
        type: "string",
        example: "Angiotensin-converting enzyme 2",
        options: true
    },
    {
        name: "Uniprot protein function",
        path: "references.proteins.functions",
        alias: "uniprotFunction",
        type: "string",
        example: "RNA binding",
        options: true
    },
    {
        name: "Program",
        path: "metadata.PROGRAM",
        alias: "program",
        type: "string",
        example: "Gromacs",
        options: true,
    },
    {
        name: "Type",
        path: "metadata.TYPE",
        alias: "type",
        type: "string",
        example: "ensemble",
        options: true,
    },
    {
        name: "MD method",
        path: "metadata.METHOD",
        alias: "method",
        type: "string",
        example: "Classical MD",
        options: true,
    },
    {
        name: "Timestep (fs)",
        path: "metadata.TIMESTEP",
        alias: "timestep",
        type: "float",
        example: "2",
        options: true,
    },
    {
        name: "Force field",
        path: "metadata.FF",
        alias: "forcefield",
        type: "string",
        example: "CHARMM36m",
        options: true,
    },
    {
        name: "Water type",
        path: "metadata.WAT",
        alias: "water",
        type: "string",
        example: "TIP3",
        options: true,
    },
    {
        name: "Temperature (K)",
        path: "metadata.TEMP",
        alias: "temperature",
        type: "float",
        example: "300",
        options: true,
    },
    {
        name: "Ensemble",
        path: "metadata.ENSEMBLE",
        alias: "ensemble",
        type: "string",
        example: "NPT",
        options: true,
    },
    {
        name: "Boxtype",
        path: "metadata.BOXTYPE",
        alias: "box",
        type: "string",
        example: "Triclinic",
        options: true,
    },
    {
        name: "Framestep (ns)",
        path: "metadata.FRAMESTEP",
        alias: "framestep",
        type: "float",
        example: "any number",
        options: false
    },
    {
        name: "Number of frames",
        path: "mds.frames",
        alias: "frames",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Chain names",
        path: "metadata.CHNAME",
        alias: "chainName",
        type: "string",
        example: "M",
        options: true,
    },
    {
        name: "Residue names",
        path: "metadata.RSNAME",
        alias: "residueName",
        type: "string",
        example: "NME",
        options: true,
    },
    {
        name: "Atom names",
        path: "metadata.ATNAME",
        alias: "atomName",
        type: "string",
        example: "OT1",
        options: true,
    },
    {
        name: "Atom elements",
        path: "metadata.ATELEM",
        alias: "atomElement",
        type: "string",
        example: "Zn",
        options: true,
    },
    {
        name: "Name",
        path: "metadata.NAME",
        alias: "name",
        type: "string",
        example: "spike opening ...",
        options: false
    },
    {
        name: "Description",
        path: "metadata.DESCRIPTION",
        alias: "description",
        type: "string",
        example: "this simulation ...",
        options: false
    },
    {
        name: "Authors",
        path: "metadata.AUTHORS",
        alias: "author",
        type: "string",
        example: "Modesto Orozco",
        options: true,
    },
    {
        name: "Groups",
        path: "metadata.GROUPS",
        alias: "group",
        type: "string",
        example: "IRB Barcelona, Orozco lab",
        options: true,
    },
    {
        name: "Citation",
        path: "metadata.CITATION",
        alias: "citation",
        type: "string",
        example: "institute of ...",
        options: false
    },
    {
        name: "Collections",
        path: "metadata.COLLECTIONS",
        alias: "collection",
        type: "string",
        example: "cv19",
        options: true,
    },
    {
        name: "Published",
        path: "published",
        alias: "published",
        type: "boolean",
        example: "true",
        options: true,
    },
    {
        name: "Posited",
        path: "posited",
        alias: "posited",
        type: "boolean",
        example: "true",
        options: true,
        global: true,
    },
    {
        name: "Source node",
        path: "node",
        alias: "node",
        type: "string",
        example: "mmb",
        options: true,
        global: true,
    },
    {
        name: "Available MD analyses",
        path: "mds.analyses.name",
        alias: "analysis",
        type: "string",
        example: "pca",
        options: true,
    },
    {
        name: "Project files",
        path: "files.name",
        alias: "file",
        type: "string",
        example: "topology.tpr",
        options: true
    },
    {
        name: "MD files",
        path: "mds.files.name",
        alias: "mdFile",
        type: "string",
        example: "pocket_10.pdb",
        options: true
    },
    {
        name: "Number of MDs",
        path: "mdcount",
        alias: "mdCount",
        type: "int",
        example: "any integer number",
        options: false
    },
    {
        name: "Last update date",
        path: "updateDate",
        alias: "updated",
        type: "date",
        example: "ISODate('2026-02-04T10:57:00.988Z')",
        options: false
    },
    {
        name: "Creation date",
        path: "creationDate",
        alias: "created",
        type: "date",
        example: "ISODate('2026-02-04T10:57:00.988Z')",
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