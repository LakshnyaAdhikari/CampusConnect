import { Link } from 'react-router-dom'
import { Users, ArrowRight } from 'lucide-react'

export default function ProfileSpacesSection({
  own = false,
  saving = false,
  handleSave = () => {},
  p = { name: '' },
  commonSpaces = [],
  studentSpaces = [],
  preferences = [],
  sharedPreferences = [],
}) {
  return (
    <div>
      <div>
        {preferences.length > 0 ? (
          preferences.map((item) => {
            const isShared = sharedPreferences.includes(item)
            return (
              <span
                key={item}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize border ${isShared ? 'bg-blush text-primary border-rose/40 shadow-sm' : 'bg-primary-50 text-muted border-line/60'}`}
              >
                {isShared ? `★ ${item.replaceAll('_', ' ')} (Shared)` : item.replaceAll('_', ' ')}
              </span>
            )
          })
        ) : (
          <span className="text-xs text-muted">No connection preferences specified.</span>
        )}
      </div>

      {own && (
        <div className="border-t border-line/60 pt-6 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2.5 font-bold"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      )}

      <div className="p-6 border-line">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-berry flex items-center gap-2">
            <Users size={16} className="text-primary" />
            {own
              ? 'My Campus Spaces'
              : commonSpaces.length > 0
                ? `Common Spaces & Domain Groups (${commonSpaces.length} Shared)`
                : `Spaces ${p.name.split(' ')[0]} Is Active In`}
          </h3>
          <Link
            to="/spaces"
            className="text-xs font-bold text-rose hover:underline inline-flex items-center gap-1"
          >
            Browse all Spaces
            <ArrowRight size={13} />
          </Link>
        </div>

        {commonSpaces.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {commonSpaces.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-2xl border border-line bg-background p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 font-bold text-primary text-xs">
                      {s.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-ink text-sm truncate">{s.name}</h4>
                      <p className="text-[11px] text-muted">
                        {s.memberCount || s.members?.length || 0} members · {s.campus}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-line/50 flex justify-end">
                  <Link
                    to={`/spaces/${s.id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-600"
                  >
                    <span>Visit Space</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : !own && studentSpaces.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {studentSpaces.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-2xl border border-line bg-background p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 font-bold text-primary text-xs">
                      {s.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-ink text-sm truncate">{s.name}</h4>
                      <p className="text-[11px] text-muted">
                        {s.memberCount || s.members?.length || 0} members · {s.campus}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-line/50 flex justify-end">
                  <Link
                    to={`/spaces/${s.id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-600"
                  >
                    <span>Visit Space</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-background p-6 text-center text-sm text-muted">
            <Users size={22} className="mx-auto text-muted/60 mb-2" />
            <p className="font-medium text-ink">
              {own
                ? 'You have not joined any campus spaces yet.'
                : `You and ${p.name.split(' ')[0]} don't share any active campus spaces yet.`}
            </p>
            <p className="text-xs text-muted mt-1">
              Campus Spaces are where students collaborate on topics, ask questions, and share study tips.
            </p>
            <Link
              to="/spaces"
              className="mt-3 inline-flex items-center gap-1 font-bold text-rose hover:underline text-xs"
            >
              Explore Campus Spaces <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}