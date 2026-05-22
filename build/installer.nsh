Function .onVerifyInstDir
  ; Avoid infinite recursion or checking empty path
  StrCmp $INSTDIR "" done

  ; Check if the path already ends with "NetOut" (case-insensitive in StrCmp)
  StrLen $0 "NetOut"
  StrCpy $1 $INSTDIR "" -$0
  StrCmp $1 "NetOut" done

  ; If it doesn't end with "NetOut", append it to the path
  StrCpy $INSTDIR "$INSTDIR\NetOut"

done:
FunctionEnd
