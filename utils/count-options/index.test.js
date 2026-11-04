const countOptions = require('.');

// Two projects, one of them with an interaction and a protein reference
const projects = [
    { _id: 'p1', metadata: { TYPE: 'trajectory', REFERENCES: ['P0DTC2'],
        INTERACTIONS: [{ name: 'RBD-ACE2', type: 'protein-protein' }] } },
    { _id: 'p2', metadata: { TYPE: 'ensemble', REFERENCES: [], INTERACTIONS: [] } },
];
const proteins = [{ uniprot: 'P0DTC2', name: 'Spike glycoprotein', domains: [{ name: 'RBD', selection: '319-541' }] }];
// Every find answers all the documents, since the counting is what is tested
const cursor = documents => ({ toArray: async () => documents });
const database = {
    REFERENCES: { proteins: { collectionName: 'uniprot_refs', idField: 'uniprot', projectIdsField: 'metadata.REFERENCES' } },
    projects: { find: async () => cursor(projects) },
    uniprot_refs: { find: async () => cursor(proteins) },
};
const count = fields => countOptions(database, {}, fields, false, false);

describe('countOptions', () => {
    test('counts the projects with each value of a field', async () => {
        expect(await count(['metadata.TYPE', 'metadata.INTERACTIONS.type', 'references.proteins.name'])).toEqual({
            'metadata.TYPE': { trajectory: 1, ensemble: 1 },
            'metadata.INTERACTIONS.type': { 'protein-protein': 1 },
            'references.proteins.name': { 'spike glycoprotein': 1 },
        });
    });

    // Objects can not be told apart as values, so one of their fields is to be counted instead
    test('refuses to count objects, naming their fields', async () => {
        expect(await count(['metadata.INTERACTIONS'])).toEqual({ code: '400', error: 'metadata.INTERACTIONS holds ' +
            'objects, so count one of their fields instead: metadata.INTERACTIONS.name, metadata.INTERACTIONS.type' });
        expect(await count(['references.proteins.domains'])).toEqual({ code: '400', error: 'references.proteins.domains ' +
            'holds objects, so count one of their fields instead: references.proteins.domains.name, ' +
            'references.proteins.domains.selection' });
    });
});
