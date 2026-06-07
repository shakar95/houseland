import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Building2, PlusCircle, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { SignInModal } from '@/components/SignInModal';

export function BottomNav() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [signInOpen, setSignInOpen] = useState(false);
  const isStaff = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  const tabs = [
    { to: '/', label: t.nav.properties, icon: Building2, end: true },
    { to: '/submit', label: t.nav.add, icon: PlusCircle, highlight: true },
    {
      to: isStaff ? '/dashboard' : profile ? '/submit' : '/login',
      label: isStaff ? t.nav.dashboard : profile ? t.nav.profile : t.auth.signIn,
      icon: User,
    },
  ];

  const renderFab = (label: string, onClick?: () => void, to?: string) => {
    const content = (
      <>
        <span className="bottom-nav-fab-circle">
          <PlusCircle className="h-6 w-6" strokeWidth={2.25} />
        </span>
        <span className="bottom-nav-fab-label">{label}</span>
      </>
    );

    if (to) {
      return (
        <NavLink to={to} className="bottom-nav-fab-btn" aria-label={t.app.addProperty}>
          {content}
        </NavLink>
      );
    }

    return (
      <button type="button" onClick={onClick} className="bottom-nav-fab-btn" aria-label={t.app.addProperty}>
        {content}
      </button>
    );
  };

  return (
    <nav className="bottom-nav" aria-label="Main">
      {tabs.map(({ to, label, icon: Icon, end, highlight }) => {
        const active = end ? location.pathname === '/' : location.pathname.startsWith(to) && to !== '/';

        if (highlight) {
          return (
            <div key={to} className="bottom-nav-fab">
              {profile ? (
                renderFab(label, undefined, to)
              ) : (
                <>
                  {renderFab(label, () => setSignInOpen(true))}
                  <SignInModal
                    open={signInOpen}
                    onClose={() => setSignInOpen(false)}
                    onSuccess={() => navigate('/submit')}
                  />
                </>
              )}
            </div>
          );
        }

        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={`bottom-nav-item ${active ? 'bottom-nav-item-active' : ''}`}
          >
            <span className="bottom-nav-item-pill">
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} />
            </span>
            <span className="bottom-nav-item-label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
