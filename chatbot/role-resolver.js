/** Resolve published group roles from their reviewed aliases, independently of
 * sentence templates. Never assign GES roles to a named nursery or another firm. */
export function resolveRoleQuery(normalized, people, context) {
  const query = ` ${normalized} `;
  const matches = people.filter(person => (person.entity.roleAliases || []).some(alias => query.includes(` ${alias.toLowerCase()} `)));
  if (!matches.length) return null;
  const aliases = matches.flatMap(person => [...person.entity.roleAliases, person.entity.role.toLowerCase()]);
  const aliasWords = new Set(aliases.flatMap(alias => alias.toLowerCase().split(' ')));
  const grammar = new Set('i to who what is are s the a an of at for in ges global education services and please tell me about show our your name person current currently role position holds hold serves serve works work as listed identify give get job published title post company manages management information want know occupies can could would you name which person has holds'.split(' '));
  const leftovers = normalized.split(' ').filter(word => !aliasWords.has(word) && !grammar.has(word));
  if (leftovers.length) return {status:'unknown', matches:[], reason:'The verified source identifies GES group leadership. It does not establish a campus role, another organization’s leadership, or unpublished personal details.'};
  // A reply to a bare role always labels GES explicitly, including a fresh chat.
  // Following a specific campus, ask for scope rather than assigning group staff.
  const groupMention = /\bges\b|global education services/.test(normalized);
  if (!groupMention && (context?.entities?.some(entity => ['mouj','qurm'].includes(entity)) || context?.graphEntityIds?.some(id=>id==='shomoukh'||id==='school-sips'))) {
    return {status:'clarify', matches:[], reason:'Do you mean GES group leadership or someone at that nursery campus? I have verified GES leadership details; campus leadership names are not published in the indexed pages.'};
  }
  return {status:'answer', matches};
}
