interface IThisProps {
  className: string;
}

function IconProjects({ className }: IThisProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6.875 2.375H15.125V21.625H6.875V2.375ZM16.5 9.25H21.3125V21.625H16.5V9.25ZM0.6875 6.5H5.5V21.625H0.6875V6.5Z" />
    </svg>
  );
}

export default IconProjects;
