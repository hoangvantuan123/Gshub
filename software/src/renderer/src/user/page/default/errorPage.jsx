import BG from '../../../assets/defaultLogo.png'

export default function ErrorPage() {
  return (
    <div className="w-full h-full bg-slate-50">
      <div className="grid h-full place-content-center bg-white px-4">
        <div className="text-center">
          <img src={BG} className=" w-20  opacity-45 h-auto mb-10" />
        </div>
      </div>
    </div>
  )
}
