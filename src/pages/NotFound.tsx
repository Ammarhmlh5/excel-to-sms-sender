import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted" dir="rtl">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">صفحة غير موجودة</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
